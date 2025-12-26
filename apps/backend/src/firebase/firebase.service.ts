import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private firebaseApp: admin.app.App;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        try {
            const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
            const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
            const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

            if (!projectId || !clientEmail || !privateKey) {
                this.logger.warn('Firebase credentials not configured - notifications disabled');
                return;
            }

            this.firebaseApp = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });

            this.logger.log('Firebase initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Firebase:', error);
        }
    }

    // Send notification to a single user
    async sendNotification(
        token: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<boolean> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized - skipping notification');
            return false;
        }

        if (!token) {
            this.logger.warn('No FCM token provided');
            return false;
        }

        try {
            const message: admin.messaging.Message = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                token,
            };

            const response = await admin.messaging().send(message);
            this.logger.log(`Notification sent successfully: ${response}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send notification: ${error.message}`);
            return false;
        }
    }

    // Send notification to multiple users
    async sendMulticastNotification(
        tokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<number> {
        if (!this.firebaseApp) {
            this.logger.warn('Firebase not initialized - skipping notifications');
            return 0;
        }

        const validTokens = tokens.filter(t => t);
        if (validTokens.length === 0) {
            this.logger.warn('No valid FCM tokens provided');
            return 0;
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                notification: {
                    title,
                    body,
                },
                data: data || {},
                tokens: validTokens,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            this.logger.log(`Sent ${response.successCount}/${validTokens.length} notifications`);
            return response.successCount;
        } catch (error) {
            this.logger.error(`Failed to send multicast notification: ${error.message}`);
            return 0;
        }
    }

    // Task-specific notification helpers
    async notifyTaskCreated(workerTokens: string[], taskTitle: string, budget: number) {
        return this.sendMulticastNotification(
            workerTokens,
            'New Task Available!',
            `${taskTitle} - ₹${budget}`,
            { type: 'task_created' },
        );
    }

    async notifyTaskAccepted(clientToken: string, workerName: string, taskTitle: string) {
        return this.sendNotification(
            clientToken,
            'Task Accepted!',
            `${workerName} accepted your task: ${taskTitle}`,
            { type: 'task_accepted' },
        );
    }

    async notifyWorkStarted(clientToken: string, taskTitle: string) {
        return this.sendNotification(
            clientToken,
            'Work Started!',
            `Worker has started work on: ${taskTitle}`,
            { type: 'work_started' },
        );
    }

    async notifyWorkSubmitted(clientToken: string, taskTitle: string) {
        return this.sendNotification(
            clientToken,
            'Work Submitted!',
            `Work completed and submitted for: ${taskTitle}`,
            { type: 'work_submitted' },
        );
    }

    async notifyAIVerified(
        clientToken: string,
        workerToken: string,
        taskTitle: string,
        approved: boolean,
        confidence: number,
    ) {
        if (approved) {
            // Notify client
            await this.sendNotification(
                clientToken,
                'Work Approved!',
                `AI verified work on ${taskTitle} (${Math.round(confidence * 100)}% confidence)`,
                { type: 'ai_approved' },
            );

            // Notify worker
            await this.sendNotification(
                workerToken,
                'Work Approved!',
                `Your work on ${taskTitle} has been approved! Payment will be released soon.`,
                { type: 'ai_approved' },
            );
        } else {
            // Notify both about rejection
            await this.sendNotification(
                workerToken,
                'Work Needs Revision',
                `AI could not verify ${taskTitle}. Please check and resubmit.`,
                { type: 'ai_rejected' },
            );
        }
    }

    async notifyPaymentReleased(workerToken: string, taskTitle: string, amount: number) {
        return this.sendNotification(
            workerToken,
            'Payment Released!',
            `₹${amount} payment released for ${taskTitle}`,
            { type: 'payment_released' },
        );
    }

    async notifyDispute(
        clientToken: string,
        workerToken: string,
        taskTitle: string,
        disputeReason: string,
    ) {
        // Notify client
        await this.sendNotification(
            clientToken,
            'Dispute Filed',
            `Your dispute for ${taskTitle} has been recorded`,
            { type: 'dispute_filed' },
        );

        // Notify worker
        await this.sendNotification(
            workerToken,
            'Task Disputed',
            `Client disputed ${taskTitle}: ${disputeReason}`,
            { type: 'task_disputed' },
        );
    }
}
