import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { google } from 'googleapis';

@Injectable()
export class ExportService {
    private readonly logger = new Logger(ExportService.name);

    constructor(private prisma: PrismaService) { }

    async exportWorkspaceToSheets(workspaceId: string, userEmail?: string) {
        // 1. Fetch Data
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                tasks: {
                    include: {
                        client: true,
                        worker: true,
                    }
                },
            },
        });

        if (!workspace) {
            throw new Error('Workspace not found');
        }

        // 2. Prepare Data for Sheets
        const headers = [
            'Task Title',
            'Description',
            'Status',
            'Category',
            'Budget (INR)',
            'Client',
            'Worker',
            'Created At',
            'Deadline'
        ];

        const rows = workspace.tasks.map(task => [
            task.title,
            task.description || '',
            task.status,
            task.category,
            task.budget || 0,
            task.client?.name || 'Unknown',
            task.worker?.name || 'Unassigned',
            task.createdAt.toISOString().split('T')[0], // YYYY-MM-DD
            task.deadline ? task.deadline.toISOString().split('T')[0] : ''
        ]);

        const data = [headers, ...rows];

        // 3. Authenticate Google Sheets
        try {
            const auth = new google.auth.GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
            });

            const sheets = google.sheets({ version: 'v4', auth });
            const drive = google.drive({ version: 'v3', auth });

            // 4. Create Spreadsheet
            const spreadsheet = await sheets.spreadsheets.create({
                requestBody: {
                    properties: {
                        title: `Workspace Export: ${workspace.name} - ${new Date().toISOString().split('T')[0]}`,
                    },
                },
            });

            const spreadsheetId = spreadsheet.data.spreadsheetId!;
            const spreadsheetUrl = spreadsheet.data.spreadsheetUrl!;

            // 5. Write Data
            await sheets.spreadsheets.values.update({
                spreadsheetId: spreadsheetId,
                range: 'Sheet1!A1',
                valueInputOption: 'RAW',
                requestBody: {
                    values: data,
                },
            });

            // 6. Format Header Row (Bold)
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId: 0,
                                    startRowIndex: 0,
                                    endRowIndex: 1,
                                },
                                cell: {
                                    userEnteredFormat: {
                                        textFormat: {
                                            bold: true,
                                        },
                                        backgroundColor: {
                                            red: 0.9,
                                            green: 0.9,
                                            blue: 0.9,
                                        },
                                    },
                                },
                                fields: 'userEnteredFormat(textFormat,backgroundColor)',
                            },
                        },
                        {
                            autoResizeDimensions: {
                                dimensions: {
                                    sheetId: 0,
                                    dimension: 'COLUMNS',
                                    startIndex: 0,
                                    endIndex: headers.length
                                }
                            }
                        }
                    ],
                },
            });

            // 7. Share with User if email provided
            if (userEmail) {
                try {
                    await drive.permissions.create({
                        fileId: spreadsheetId!,
                        requestBody: {
                            role: 'writer',
                            type: 'user',
                            emailAddress: userEmail
                        }
                    });
                } catch (e: any) {
                    this.logger.warn(`Failed to share spreadsheet with ${userEmail}: ${e.message}`);
                    // If sharing fails, we might want to make it public or just return the URL and hope the service account owns it and user can request access?
                    // For now, we'll try to make it readable by anyone with link if specific share fails? 
                    // No, that's insecure. We'll just return the URL.
                }
            }

            return { url: spreadsheetUrl };

        } catch (error) {
            this.logger.error('Google Sheets API Error:', error);

            // Fallback for demo/dev without credentials:
            // In a real app, we'd throw. Here, we might want to return a mock URL or explanation.
            if (error.message.includes('Could not load the default credentials')) {
                throw new Error('Google Cloud Credentials not configured. Please set GOOGLE_APPLICATION_CREDENTIALS.');
            }
            throw error;
        }
    }
}
