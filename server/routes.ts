import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authMiddleware } from "./middleware/auth";
import { investmentService } from "./services/investmentService";
import { workflowService } from "./services/workflowService";
import { notificationService } from "./services/notificationService";
import { authService } from "./services/authService";
import { siaService } from "./services/siaService";
import { landNotificationService } from "./services/landNotificationService";
import { objectionService } from "./services/objectionService";
import { reportsService } from "./services/reportsService";
import { compensationService } from "./services/compensationService";
import { possessionService } from "./services/possessionService";
import { partyService } from "./services/propertyManagement/partyService";
import { schemeService } from "./services/propertyManagement/schemeService";
import { propertyService } from "./services/propertyManagement/propertyService";
import { allotmentService } from "./services/propertyManagement/allotmentService";
import { drawService } from "./services/propertyManagement/drawService";
import { transferService } from "./services/propertyManagement/transferService";
import { mortgageService } from "./services/propertyManagement/mortgageService";
import { modificationService } from "./services/propertyManagement/modificationService";
import { nocService } from "./services/propertyManagement/nocService";
import { registrationService } from "./services/propertyManagement/registrationService";
import { valuationService } from "./services/propertyManagement/valuationService";
import { encumbranceService } from "./services/propertyManagement/encumbranceService";
import { sroService } from "./services/propertyManagement/sroService";
import { deedService } from "./services/propertyManagement/deedService";
import { conveyanceService } from "./services/propertyManagement/conveyanceService";
import { demandNoteService } from "./services/propertyManagement/demandNoteService";
import { paymentService } from "./services/propertyManagement/paymentService";
import { receiptService } from "./services/propertyManagement/receiptService";
import { refundService } from "./services/propertyManagement/refundService";
import { ledgerService } from "./services/propertyManagement/ledgerService";
import { waterConnectionService } from "./services/propertyManagement/waterConnectionService";
import { sewerageConnectionService } from "./services/propertyManagement/sewerageConnectionService";
import { grievanceService } from "./services/propertyManagement/grievanceService";
import { legalCaseService } from "./services/propertyManagement/legalCaseService";
import { citizenService } from "./services/propertyManagement/citizenService";
import { passbookService } from "./services/propertyManagement/passbookService";
import { serviceRequestService } from "./services/propertyManagement/serviceRequestService";
import { demarcationService } from "./services/propertyManagement/demarcationService";
import { dpcService } from "./services/propertyManagement/dpcService";
import { certificateService } from "./services/propertyManagement/certificateService";
import { deviationService } from "./services/propertyManagement/deviationService";
import { pmsAnalyticsService } from "./services/propertyManagement/pmsAnalyticsService";
import { pmsReportsService } from "./services/propertyManagement/pmsReportsService";
import { documentAnalysisService } from "./services/documentAnalysisService";
import { vectorStoreService } from "./services/vectorStoreService";
import { backgroundJobService } from "./services/backgroundJobService";
import { fileUpload } from "./utils/fileUpload";
import { db } from "./db";
import { insertInvestmentRequestSchema, insertCashRequestSchema, insertUserSchema, insertTemplateSchema, insertInvestmentRationaleSchema, documents, backgroundJobs } from "@shared/schema";
import { enhanceText, type EnhancementType } from "./services/textEnhancementService.js";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import exifr from "exifr";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      
      if (!result.success) {
        return res.status(401).json({ message: result.message });
      }
      
      // Set session
      req.session.userId = result.user!.id;
      req.session.userRole = result.user!.role;
      
      res.json({ user: result.user, message: 'Login successful' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const result = await authService.register(userData);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      res.json({ user: result.user, message: 'Registration successful' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', authMiddleware, async (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: 'Could not log out' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.userId!);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/dashboard/enhanced-stats', authMiddleware, async (req, res) => {
    try {
      const stats = await storage.getEnhancedDashboardStats(req.userId!);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching enhanced dashboard stats:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/dashboard/recent-requests', authMiddleware, async (req, res) => {
    try {
      // Get current user to check role
      const currentUser = await storage.getUser(req.userId!);
      console.log('Current user for recent requests:', currentUser);
      
      // Analysts can only see their own requests
      const userId = currentUser?.role === 'analyst' ? req.userId : undefined;
      console.log('Using userId filter:', userId);
      
      const requests = await storage.getRecentRequests(10, userId);
      console.log('Found requests:', requests);
      res.json(requests);
    } catch (error) {
      console.error('Error in recent requests endpoint:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Investment request routes
  app.post('/api/investments', authMiddleware, async (req, res) => {
    try {
      console.log('Request body:', req.body);
      console.log('User ID:', req.userId);
      
      const requestData = {
        ...req.body,
        requesterId: req.userId,
      };
      
      console.log('Request data before validation:', requestData);
      
      // Validate only the necessary fields (requestId will be generated in service)
      const validationSchema = insertInvestmentRequestSchema.omit({
        requestId: true,
        currentApprovalStage: true,
        slaDeadline: true,
      });
      
      const validatedData = validationSchema.parse(requestData);
      console.log('Validated data:', validatedData);
      
      const request = await investmentService.createInvestmentRequest(validatedData);
      res.json(request);
    } catch (error) {
      console.error('Investment creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/investments', authMiddleware, async (req, res) => {
    try {
      const { status, my } = req.query;
      const currentUser = await storage.getUser(req.userId!);
      
      if (!currentUser) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      let requests: any[] = [];
      
      if (currentUser.role === 'analyst') {
        // Analysts see all proposals initiated by them irrespective of status
        const filters: any = { userId: req.userId };
        requests = await storage.getInvestmentRequests(filters);
      } else if (currentUser.role === 'admin') {
        // Admins see all proposals
        const filters: any = {};
        requests = await storage.getInvestmentRequests(filters);
      } else if (['manager', 'committee_member', 'finance'].includes(currentUser.role)) {
        // Manager/Committee/Finance see only proposals they have acted on
        const approvals = await storage.getApprovalsByUser(req.userId!);
        const requestIds = approvals.map(approval => approval.requestId);
        
        if (requestIds.length > 0) {
          const allRequests = await storage.getInvestmentRequests({});
          requests = allRequests.filter(request => requestIds.includes(request.id));
        }
      }
      
      // Apply status filtering after getting the base requests
      if (status) {
        if (status === 'pending') {
          // Pending means not fully approved and not rejected
          requests = requests.filter(request => {
            const requestStatus = request.status.toLowerCase();
            return !requestStatus.includes('approved') && !requestStatus.includes('rejected') && requestStatus !== 'approved';
          });
        } else if (status === 'approved') {
          // Approved means final approval status (only "approved", not partial approvals)
          requests = requests.filter(request => request.status.toLowerCase() === 'approved');
        } else if (status === 'rejected') {
          // Rejected by any approver
          requests = requests.filter(request => {
            const requestStatus = request.status.toLowerCase();
            return requestStatus === 'rejected' || requestStatus.includes('rejected');
          });
        } else {
          // For other statuses, use exact match
          requests = requests.filter(request => request.status === status);
        }
      }
      
      res.json(requests);
    } catch (error) {
      console.error('Error fetching investments:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getInvestmentRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Investment request not found' });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.userId!;

      // Get the investment request to check its status
      const investment = await storage.getInvestmentRequest(id);
      if (!investment) {
        return res.status(404).json({ message: 'Investment request not found' });
      }

      // Check ownership
      if (investment.requesterId !== userId) {
        return res.status(403).json({ message: 'You can only delete your own investment requests' });
      }

      // Check for existing approvals only for active workflow statuses
      const activeWorkflowStatuses = ['new', 'Manager approved', 'Committee approved', 'Finance approved', 'approved'];
      if (activeWorkflowStatuses.includes(investment.status)) {
        const approvals = await storage.getApprovalsByRequest('investment', id);
        if (approvals.length > 0) {
          return res.status(400).json({ 
            message: 'Cannot delete investment request that is actively in the approval workflow.' 
          });
        }
      }

      const success = await storage.softDeleteInvestmentRequest(id, userId);
      
      if (!success) {
        return res.status(400).json({ 
          message: 'Cannot delete this investment request. It may be in a non-deletable status.' 
        });
      }
      
      res.json({ message: 'Investment request deleted successfully' });
    } catch (error) {
      console.error('Error deleting investment:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Route for submitting draft for approval - placed before the generic PUT route
  app.post('/api/investments/:id/submit', authMiddleware, async (req, res) => {
    try {
      console.log('Submit route called with ID:', req.params.id);
      const id = parseInt(req.params.id);
      const userId = req.userId!;
      
      console.log('Submitting draft request for ID:', id, 'by user:', userId);
      const request = await investmentService.submitDraftRequest(id, userId);
      console.log('Draft submitted successfully:', request);
      res.json(request);
    } catch (error) {
      console.error('Error submitting draft:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  app.put('/api/investments/:id', authMiddleware, async (req, res) => {
    try {
      console.log('Investment update request received:', req.params.id);
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      console.log('Update data:', updateData);
      
      const request = await storage.updateInvestmentRequest(id, updateData);
      console.log('Investment update successful:', request.id);
      res.json(request);
    } catch (error) {
      console.error('Investment update error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Route for modifying rejected requests
  app.put('/api/investments/:id/modify', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const request = await investmentService.modifyInvestmentRequest(id, updateData, req.userId!);
      res.json(request);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });



  // Cash request routes
  app.post('/api/cash-requests', authMiddleware, async (req, res) => {
    try {
      const requestData = insertCashRequestSchema.parse({
        ...req.body,
        requesterId: req.userId,
      });
      
      const request = await investmentService.createCashRequest(requestData);
      res.json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/cash-requests', authMiddleware, async (req, res) => {
    try {
      const { status, my } = req.query;
      const filters: any = {};
      
      if (status) filters.status = status as string;
      if (my === 'true') filters.userId = req.userId;
      
      const requests = await storage.getCashRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/cash-requests/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getCashRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Cash request not found' });
      }
      
      res.json(request);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Task routes
  app.get('/api/tasks', authMiddleware, async (req, res) => {
    try {
      const tasks = await storage.getTasksByUser(req.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/tasks/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const task = await storage.updateTask(id, updateData);
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Approval routes
  app.post('/api/approvals', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId, action, comments } = req.body;
      
      const result = await workflowService.processApproval(
        requestType,
        requestId,
        req.userId!,
        action,
        comments
      );
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/approvals/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const approvals = await storage.getApprovalsByRequest(requestType, parseInt(requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // New endpoint for current cycle approvals only
  app.get('/api/approvals/:requestType/:requestId/current', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const approvals = await storage.getCurrentCycleApprovalsByRequest(requestType, parseInt(requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // New endpoint for all cycle approvals (complete history)
  app.get('/api/approvals/:requestType/:requestId/all', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const approvals = await storage.getAllCycleApprovalsByRequest(requestType, parseInt(requestId));
      res.json(approvals);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Document routes
  app.post('/api/documents/upload', authMiddleware, fileUpload.array('documents'), async (req, res) => {
    try {
      const { requestType, requestId, categories, categoryId, subcategoryId } = req.body;
      const files = req.files as Express.Multer.File[];
      
      console.log(`Document upload request: ${req.userId}, requestType: ${requestType}, requestId: ${requestId}, files: ${files?.length || 0}`);
      
      if (!files || files.length === 0) {
        console.warn('No files provided in upload request');
        return res.status(400).json({ message: 'No files uploaded' });
      }

      if (!requestType || !requestId) {
        console.warn('Missing required parameters: requestType or requestId');
        return res.status(400).json({ message: 'Missing required parameters: requestType and requestId are required' });
      }
      
      const documents = [];
      const errors = [];
      
      // Process files individually to handle partial failures
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          console.log(`Processing file ${i + 1}/${files.length}: ${file.originalname} (${file.size} bytes)`);
          
          // Validate file
          if (!file.originalname || file.size === 0) {
            throw new Error(`Invalid file: ${file.originalname || 'unknown'}`);
          }
          
          const documentData: any = {
            fileName: file.filename,
            originalName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            fileUrl: file.path,
            uploaderId: req.userId!,
            requestType,
            requestId: parseInt(requestId),
          };
          
          // Legacy support: Add single category information if provided
          if (categoryId) {
            documentData.categoryId = parseInt(categoryId);
          }
          if (subcategoryId) {
            documentData.subcategoryId = parseInt(subcategoryId);
          }
          
          const document = await storage.createDocument(documentData);
          console.log(`Document record created: ${document.id} for file ${file.originalname}`);
          
          // Handle multiple category associations
          if (categories && categories.length > 0) {
            try {
              const categoryList = Array.isArray(categories) ? categories : JSON.parse(categories);
              for (const category of categoryList) {
                await storage.createDocumentCategoryAssociation(
                  document.id,
                  category.categoryId,
                  category.customCategoryName || null
                );
              }
              console.log(`Category associations created for document ${document.id}`);
            } catch (categoryError) {
              console.error(`Failed to create category associations for document ${document.id}:`, categoryError);
              // Continue processing - category associations are not critical
            }
          }
          
          documents.push(document);
          
          // Queue background job for AI processing
          try {
            const currentUser = await storage.getUser(req.userId!);
            if (currentUser) {
              console.log(`Queueing background AI preparation for ${currentUser.role}: ${document.fileName}`);
              await backgroundJobService.addJob({
                jobType: 'prepare-ai',
                documentId: document.id,
                requestType,
                requestId: parseInt(requestId),
                priority: 'high'
              });
              console.log(`Background job queued for document ${document.id}`);
            }
          } catch (backgroundJobError) {
            console.error(`Failed to queue background job for document ${document.id}:`, backgroundJobError);
            // Continue processing - background job failure shouldn't block upload
          }
          
        } catch (fileError) {
          console.error(`Failed to process file ${file.originalname}:`, fileError);
          errors.push({
            fileName: file.originalname,
            error: fileError instanceof Error ? fileError.message : String(fileError)
          });
        }
      }
      
      // If no documents were successfully processed, return error
      if (documents.length === 0) {
        console.error('No documents were successfully processed');
        return res.status(500).json({ 
          message: 'Failed to upload any documents',
          errors 
        });
      }
      
      // If some documents failed, include errors in response but still return success
      const response: any = { 
        documents,
        successful: documents.length,
        total: files.length
      };
      
      if (errors.length > 0) {
        response.errors = errors;
        response.message = `${documents.length}/${files.length} documents uploaded successfully`;
        console.warn(`Partial upload success: ${documents.length}/${files.length} files processed`);
      } else {
        console.log(`All ${documents.length} documents uploaded successfully`);
      }
      
      res.json(response);
    } catch (error) {
      console.error('Document upload system error:', error);
      res.status(500).json({ 
        message: 'Document upload system error',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Investment document upload endpoint
  app.post('/api/documents/investment/:investmentId', authMiddleware, fileUpload.array('documents'), async (req, res) => {
    try {
      console.log('Investment document upload request received:', req.params);
      const { investmentId } = req.params;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }
      
      console.log(`Processing ${files.length} files for investment ${investmentId}`);
      
      const documents = [];
      for (const file of files) {
        console.log(`Creating document record for: ${file.originalname}`);
        const document = await storage.createDocument({
          fileName: file.filename,
          originalName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          fileUrl: file.path,
          uploaderId: req.userId!,
          requestType: 'investment',
          requestId: parseInt(investmentId),
        });
        documents.push(document);
        
        // Queue background job for AI processing
        const currentUser = await storage.getUser(req.userId!);
        if (currentUser) {
          console.log(`Queueing background AI preparation for ${currentUser.role}: ${document.fileName}`);
          await backgroundJobService.addJob({
            jobType: 'prepare-ai',
            documentId: document.id,
            requestType: 'investment',
            requestId: parseInt(investmentId),
            priority: 'high'
          });
        }
      }
      
      console.log(`Successfully processed ${documents.length} documents`);
      res.json(documents);
    } catch (error) {
      console.error('Investment document upload error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Add preview endpoint (must come before the general documents route)
  app.get('/api/documents/preview/:documentId', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Preview request for document ID:', documentId);
      
      const document = await storage.getDocument(parseInt(documentId));
      console.log('Found document:', document);
      
      if (!document) {
        console.log('Document not found in database');
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), document.fileUrl);
      console.log('Checking file path:', filePath);
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        console.log('File does not exist on disk:', filePath);
        return res.status(404).json({ message: 'File not found on server' });
      }
      
      console.log('File exists, preparing preview');
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', 'inline'); // For preview, not attachment
      
      // Get file stats for proper content length
      const stats = await fs.promises.stat(filePath);
      res.setHeader('Content-Length', stats.size.toString());
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Preview error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  app.get('/api/documents/download/:documentId', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Download request for document ID:', documentId);
      
      const document = await storage.getDocument(parseInt(documentId));
      console.log('Found document:', document);
      
      if (!document) {
        console.log('Document not found in database');
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), document.fileUrl);
      console.log('Checking file path:', filePath);
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
      } catch (err) {
        console.log('File does not exist on disk:', filePath);
        return res.status(404).json({ message: 'File not found on server' });
      }
      
      console.log('File exists, preparing download');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.originalName)}"`);
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      
      // Get file stats for proper content length
      const stats = await fs.promises.stat(filePath);
      res.setHeader('Content-Length', stats.size.toString());
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        console.error('File stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error reading file' });
        }
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  });

  // Delete document endpoint
  app.delete('/api/documents/:documentId', authMiddleware, async (req, res) => {
    try {
      console.log('Delete document request received for ID:', req.params.documentId);
      const { documentId } = req.params;
      const document = await storage.getDocument(parseInt(documentId));
      
      if (!document) {
        console.log(`Document not found in database: ${documentId}`);
        return res.status(404).json({ message: 'Document not found' });
      }
      
      console.log(`Found document to delete: ${document.originalName}`);
      
      // First, delete any related background jobs to avoid foreign key constraint
      await db.delete(backgroundJobs).where(eq(backgroundJobs.documentId, parseInt(documentId)));
      console.log(`Deleted background jobs for document: ${documentId}`);
      
      // Delete the file from disk
      const filePath = path.join(process.cwd(), document.fileUrl);
      try {
        await fs.promises.unlink(filePath);
        console.log(`File deleted from disk: ${filePath}`);
      } catch (error) {
        console.log(`File not found on disk, continuing with database deletion: ${filePath}`);
      }
      
      // Delete from database
      await storage.deleteDocument(parseInt(documentId));
      console.log(`Document deleted from database: ${documentId}`);
      
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Check document background job status (must come before the general :requestType/:requestId route)
  app.get('/api/documents/:documentId/job-status', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      
      // Validate that documentId is a valid integer
      const docId = parseInt(documentId);
      if (isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      // Direct database query to bypass storage method issue
      const jobs = await db
        .select()
        .from(backgroundJobs)
        .where(eq(backgroundJobs.documentId, docId))
        .orderBy(desc(backgroundJobs.createdAt));
      
      if (jobs.length === 0) {
        return res.json({ hasJob: false });
      }
      
      // Get the most recent job
      const latestJob = jobs[0];
      
      res.json({
        hasJob: true,
        job: {
          id: latestJob.id,
          status: latestJob.status,
          jobType: latestJob.jobType,
          currentStep: latestJob.currentStep,
          stepProgress: latestJob.stepProgress,
          totalSteps: latestJob.totalSteps,
          currentStepNumber: latestJob.currentStepNumber,
          createdAt: latestJob.createdAt,
          completedAt: latestJob.completedAt,
          errorMessage: latestJob.errorMessage
        },
        needsManualTrigger: !latestJob || latestJob.status === 'failed'
      });
    } catch (error) {
      console.error('Job status error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get document queries history - MUST come before generic :requestType/:requestId route
  app.get('/api/documents/:documentId/queries', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      console.log('Fetching queries for document:', documentId);
      
      // Check if documentId is valid
      if (!documentId || isNaN(parseInt(documentId))) {
        console.error('Invalid document ID:', documentId);
        return res.status(400).json({ message: 'Invalid document ID' });
      }

      const queries = await storage.getDocumentQueries(parseInt(documentId));
      console.log('Found queries:', queries.length);
      res.json(queries);
    } catch (error) {
      console.error('Error getting document queries:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
      res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  });

  // Document analysis endpoint - MUST come before generic :requestType/:requestId route
  app.get('/api/documents/:documentId/analysis', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const docId = parseInt(documentId);
      if (isNaN(docId)) {
        return res.status(400).json({ message: 'Invalid document ID' });
      }
      
      const analysis = await storage.getDocumentAnalysis(docId);
      
      if (!analysis) {
        return res.status(404).json({ message: 'Analysis not found' });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error('Error getting document analysis:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/documents/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const documents = await storage.getDocumentsByRequest(requestType, parseInt(requestId));
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Document AI preparation route - Stage 1: Upload to vector store
  app.post('/api/documents/:documentId/prepare-ai', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      const document = await storage.getDocument(parseInt(documentId));
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Import prepare AI service
      const { prepareAIService } = await import('./services/prepareAIService');
      
      // Prepare document for AI analysis
      const result = await prepareAIService.prepareDocumentForAI(
        parseInt(documentId),
        filePath,
        document.fileName
      );
      
      res.json({
        message: result.message,
        success: result.success,
        fileId: result.fileId
      });
      
    } catch (error) {
      console.error('AI preparation failed:', error);
      
      // Update status to failed
      if (req.params.documentId) {
        await storage.updateDocument(parseInt(req.params.documentId), {
          analysisStatus: 'failed'
        });
      }
      
      res.status(500).json({ 
        error: 'AI preparation failed',
        message: error.message 
      });
    }
  });



  // Document AI insights route - Stage 3: Get insights from vector store
  app.post('/api/documents/:documentId/get-insights', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      
      // Import get insights service
      const { getInsightsService } = await import('./services/getInsightsService');
      
      // Generate insights for the document
      const result = await getInsightsService.generateInsights(parseInt(documentId));
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to generate insights' 
        });
      }
      
      res.json({
        summary: result.summary,
        insights: result.insights,
        success: true
      });
      
    } catch (error) {
      console.error('Get insights failed:', error);
      res.status(500).json({ 
        error: 'Failed to generate insights',
        message: error.message 
      });
    }
  });

  // Document custom query route - allows approvers to ask specific questions
  app.post('/api/documents/:documentId/custom-query', authMiddleware, async (req, res) => {
    try {
      const { documentId } = req.params;
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      // Import get insights service to reuse vector store functionality
      const { getInsightsService } = await import('./services/getInsightsService');
      
      // Process custom query for the document
      const result = await getInsightsService.processCustomQuery(parseInt(documentId), query);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process custom query' 
        });
      }
      
      // Save query and response to database
      await storage.saveDocumentQuery({
        documentId: parseInt(documentId),
        userId: req.userId!,
        query,
        response: result.answer || ''
      });
      
      res.json({
        answer: result.answer,
        success: true
      });
      
    } catch (error) {
      console.error('Custom query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process custom query',
        message: error.message 
      });
    }
  });



  app.get('/api/documents/insights/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const insights = await documentAnalysisService.getDocumentInsights(
        requestType, 
        parseInt(requestId)
      );
      
      res.json(insights);
    } catch (error) {
      console.error('Document insights error:', error);
      res.status(500).json({ message: 'Failed to get document insights' });
    }
  });

  // Cross-document query endpoints
  app.post('/api/cross-document-queries', authMiddleware, async (req, res) => {
    try {
      const { requestId, query, documentIds } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      if (!requestId || typeof requestId !== 'number') {
        return res.status(400).json({ 
          error: 'Request ID is required and must be a number',
          message: 'Invalid request ID' 
        });
      }
      
      // Import cross-document query service
      const { crossDocumentQueryService } = await import('./services/crossDocumentQueryService');
      
      // Process cross-document query with optional document filtering
      const result = await crossDocumentQueryService.processCrossDocumentQuery(
        'investment', // Default to investment for unified interface
        requestId,
        req.userId!,
        query,
        documentIds
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process cross-document query' 
        });
      }
      
      res.json({
        answer: result.answer,
        documentCount: result.documentCount,
        responseId: result.responseId,
        success: true
      });
      
    } catch (error) {
      console.error('Cross-document query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process cross-document query',
        message: error.message 
      });
    }
  });

  // Legacy cross-document query endpoint for backward compatibility
  app.post('/api/documents/cross-query/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      // Import cross-document query service
      const { crossDocumentQueryService } = await import('./services/crossDocumentQueryService');
      
      // Process cross-document query without document filtering (legacy behavior)
      const result = await crossDocumentQueryService.processCrossDocumentQuery(
        requestType,
        parseInt(requestId),
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process cross-document query' 
        });
      }
      
      res.json({
        answer: result.answer,
        documentCount: result.documentCount,
        responseId: result.responseId,
        success: true
      });
      
    } catch (error) {
      console.error('Cross-document query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process cross-document query',
        message: error.message 
      });
    }
  });

  // Get cross-document queries history for unified interface
  app.get('/api/cross-document-queries/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestId } = req.params;
      
      // Get query history for this request
      const queries = await storage.getCrossDocumentQueries('investment', parseInt(requestId));
      
      res.json(queries);
    } catch (error) {
      console.error('Error getting cross-document queries:', error);
      res.status(500).json({ message: 'Failed to get query history' });
    }
  });

  // Unified Web Search Routes (for UnifiedSearchInterface)
  app.post('/api/web-search-queries', authMiddleware, async (req, res) => {
    try {
      console.log('=== WEB SEARCH API HIT ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', req.userId);
      
      const { requestType, requestId, query } = req.body;
      
      if (!requestType || !requestId || !query || typeof query !== 'string') {
        console.log('❌ Validation failed');
        return res.status(400).json({ 
          error: 'Missing required fields: requestType, requestId, query',
          message: 'Invalid request format' 
        });
      }
      
      // Import web search service
      const { webSearchService } = await import('./services/webSearchService');
      
      // Process web search query
      const result = await webSearchService.processWebSearchQuery(
        requestType,
        requestId,
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process web search query' 
        });
      }
      
      res.json({
        answer: result.answer,
        responseId: result.responseId || undefined,
        success: true
      });
      
    } catch (error) {
      console.error('Web search query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process web search query',
        message: error.message 
      });
    }
  });

  app.get('/api/web-search-queries', authMiddleware, async (req, res) => {
    try {
      const { requestId } = req.query;
      
      if (!requestId) {
        return res.status(400).json({ 
          error: 'Missing requestId parameter',
          message: 'Request ID is required' 
        });
      }
      
      // Get web search query history for this request
      const queries = await storage.getWebSearchQueries('investment_request', parseInt(requestId as string));
      
      // Transform data to match UnifiedSearchInterface format
      const transformedQueries = queries.map(query => ({
        id: query.id,
        query: query.query,
        response: query.response,
        searchType: 'web' as const,
        createdAt: query.createdAt,
        // user property doesn't exist in the query result
      }));
      
      res.json(transformedQueries);
    } catch (error) {
      console.error('Error getting web search queries:', error);
      res.status(500).json({ message: 'Failed to get web search history' });
    }
  });

  // Delete web search query endpoint
  app.delete('/api/web-search-queries/:queryId', authMiddleware, async (req, res) => {
    try {
      const { queryId } = req.params;
      const queryIdInt = parseInt(queryId);
      
      if (!queryIdInt) {
        return res.status(400).json({ 
          error: 'Invalid query ID',
          message: 'Query ID must be a valid number' 
        });
      }
      
      // Delete the web search query
      const deleted = await storage.deleteWebSearchQuery(queryIdInt, req.userId!);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Query not found',
          message: 'Web search query not found or not authorized to delete' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Web search query deleted successfully' 
      });
      
    } catch (error) {
      console.error('Error deleting web search query:', error);
      res.status(500).json({ message: 'Failed to delete web search query' });
    }
  });

  // Delete cross-document query endpoint
  app.delete('/api/cross-document-queries/:queryId', authMiddleware, async (req, res) => {
    try {
      const { queryId } = req.params;
      const queryIdInt = parseInt(queryId);
      
      if (!queryIdInt) {
        return res.status(400).json({ 
          error: 'Invalid query ID',
          message: 'Query ID must be a valid number' 
        });
      }
      
      // Delete the cross-document query
      const deleted = await storage.deleteCrossDocumentQuery(queryIdInt, req.userId!);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Query not found',
          message: 'Cross-document query not found or not authorized to delete' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Cross-document query deleted successfully' 
      });
      
    } catch (error) {
      console.error('Error deleting cross-document query:', error);
      res.status(500).json({ message: 'Failed to delete cross-document query' });
    }
  });

  // Legacy cross-document query history endpoint
  app.get('/api/documents/cross-query/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      
      // Get query history for this request
      const queries = await storage.getCrossDocumentQueries(requestType, parseInt(requestId));
      
      res.json(queries);
    } catch (error) {
      console.error('Error getting cross-document queries:', error);
      res.status(500).json({ message: 'Failed to get query history' });
    }
  });

  // Web search query endpoints
  app.post('/api/documents/web-search/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ 
          error: 'Query is required and must be a string',
          message: 'Invalid query format' 
        });
      }
      
      // Import web search service
      const { webSearchService } = await import('./services/webSearchService');
      
      // Process web search query
      const result = await webSearchService.processWebSearchQuery(
        requestType,
        parseInt(requestId),
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process web search query' 
        });
      }
      
      res.json({
        answer: result.answer,
        success: true
      });
      
    } catch (error) {
      console.error('Web search query failed:', error);
      res.status(500).json({ 
        error: 'Failed to process web search query',
        message: error.message 
      });
    }
  });

  app.get('/api/documents/web-search/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      
      // Get web search query history for this request
      const queries = await storage.getWebSearchQueries(requestType, parseInt(requestId));
      
      res.json(queries);
    } catch (error) {
      console.error('Error getting web search queries:', error);
      res.status(500).json({ message: 'Failed to get web search history' });
    }
  });



  app.post('/api/documents/batch-analyze', authMiddleware, async (req, res) => {
    try {
      const { documentIds } = req.body;
      
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        return res.status(400).json({ message: 'Invalid document IDs' });
      }
      
      const results = await documentAnalysisService.batchAnalyzeDocuments(documentIds);
      res.json({ 
        message: 'Batch analysis completed', 
        results,
        total: results.length 
      });
    } catch (error) {
      console.error('Batch analysis error:', error);
      res.status(500).json({ message: 'Batch analysis failed' });
    }
  });

  app.get('/api/documents/pending-analysis', authMiddleware, async (req, res) => {
    try {
      const pendingDocuments = await storage.getDocumentsByAnalysisStatus('pending');
      res.json(pendingDocuments);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all documents for analytics
  app.get('/api/documents/all', authMiddleware, async (req, res) => {
    try {
      // Get all documents from storage
      const allDocuments = await db.select().from(documents);
      res.json(allDocuments);
    } catch (error) {
      console.error('Error fetching all documents:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Force complete stuck processing documents
  app.post('/api/documents/force-complete', authMiddleware, async (req, res) => {
    try {
      // Update documents stuck in processing to completed
      const processingDocuments = await db.select().from(documents)
        .where(eq(documents.analysisStatus, 'processing'));
      
      for (const doc of processingDocuments) {
        await storage.updateDocument(doc.id, {
          analysisStatus: 'completed',
          analyzedAt: new Date()
        });
      }
      
      res.json({ 
        message: 'Forced completion of stuck documents',
        count: processingDocuments.length 
      });
    } catch (error) {
      console.error('Error forcing document completion:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Approval routes
  app.get('/api/approvals/:requestType/:requestId', authMiddleware, async (req, res) => {
    try {
      const { requestType, requestId } = req.params;
      const requestIdNumber = parseInt(requestId);
      
      if (isNaN(requestIdNumber)) {
        return res.status(400).json({ error: 'Invalid request ID' });
      }
      
      const approvals = await storage.getApprovalsByRequest(requestType, requestIdNumber);
      res.json(approvals);
    } catch (error) {
      console.error('Error fetching approvals:', error);
      res.status(500).json({ error: 'Failed to fetch approvals' });
    }
  });

  // Notification routes
  app.get('/api/notifications', authMiddleware, async (req, res) => {
    try {
      const notifications = await storage.getUserNotifications(req.userId!);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.patch('/api/notifications/:id/read', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/notifications/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteNotification(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Text Enhancement API
  app.post('/api/text/enhance', authMiddleware, async (req, res) => {
    try {
      const { text, type } = req.body;
      
      if (!text || !text.trim()) {
        return res.status(400).json({ message: 'Text is required' });
      }
      
      if (!['professional', 'grammar', 'clarity', 'rewrite'].includes(type)) {
        return res.status(400).json({ message: 'Invalid enhancement type' });
      }
      
      const enhancedText = await enhanceText(text, type as EnhancementType);
      res.json({ enhancedText });
    } catch (error) {
      console.error('Text enhancement error:', error);
      res.status(500).json({ message: 'Failed to enhance text' });
    }
  });

  // Template routes
  app.get('/api/templates/:type', authMiddleware, async (req, res) => {
    try {
      const { type } = req.params;
      const templates = await storage.getTemplatesByType(type);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Vector Store routes
  app.post('/api/vector-store/upload/:documentId', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      const filePath = path.join(process.cwd(), 'uploads', document.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File not found on disk' });
      }
      
      const result = await vectorStoreService.uploadDocumentToVectorStore(documentId, filePath);
      res.json({ 
        message: 'Document uploaded to vector store successfully',
        vectorStoreDocument: result 
      });
    } catch (error) {
      console.error('Vector store upload error:', error);
      res.status(500).json({ message: error.message || 'Failed to upload to vector store' });
    }
  });

  app.post('/api/vector-store/batch-upload', authMiddleware, async (req, res) => {
    try {
      const { documentIds } = req.body;
      
      if (!Array.isArray(documentIds)) {
        return res.status(400).json({ message: 'documentIds must be an array' });
      }
      
      const results = await vectorStoreService.batchUploadDocuments(documentIds);
      res.json({ 
        message: `Uploaded ${results.length} documents to vector store`,
        vectorStoreDocuments: results 
      });
    } catch (error) {
      console.error('Vector store batch upload error:', error);
      res.status(500).json({ message: error.message || 'Failed to batch upload to vector store' });
    }
  });

  app.post('/api/vector-store/query', authMiddleware, async (req, res) => {
    try {
      const { query, vectorStoreId, fileId, limit } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      const results = await vectorStoreService.queryVectorStore({
        query,
        vectorStoreId,
        fileId,
        limit
      });
      
      res.json({ 
        message: 'Query executed successfully',
        results 
      });
    } catch (error) {
      console.error('Vector store query error:', error);
      res.status(500).json({ message: error.message || 'Failed to query vector store' });
    }
  });

  app.post('/api/vector-store/query-document/:fileId', authMiddleware, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: 'Query is required' });
      }
      
      const results = await vectorStoreService.querySpecificDocument(fileId, query);
      res.json({ 
        message: 'Document query executed successfully',
        results 
      });
    } catch (error) {
      console.error('Document query error:', error);
      res.status(500).json({ message: error.message || 'Failed to query document' });
    }
  });

  app.get('/api/vector-store/info/:vectorStoreId?', authMiddleware, async (req, res) => {
    try {
      const { vectorStoreId } = req.params;
      const info = await vectorStoreService.getVectorStoreInfo(vectorStoreId);
      res.json(info);
    } catch (error) {
      console.error('Vector store info error:', error);
      res.status(500).json({ message: error.message || 'Failed to get vector store info' });
    }
  });

  app.get('/api/vector-store/files/:vectorStoreId?', authMiddleware, async (req, res) => {
    try {
      const { vectorStoreId } = req.params;
      const files = await vectorStoreService.listVectorStoreFiles(vectorStoreId);
      res.json(files);
    } catch (error) {
      console.error('Vector store files error:', error);
      res.status(500).json({ message: error.message || 'Failed to list vector store files' });
    }
  });

  app.delete('/api/vector-store/file/:fileId', authMiddleware, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { vectorStoreId } = req.body;
      
      await vectorStoreService.deleteDocumentFromVectorStore(fileId, vectorStoreId);
      res.json({ message: 'Document deleted from vector store successfully' });
    } catch (error) {
      console.error('Vector store delete error:', error);
      res.status(500).json({ message: error.message || 'Failed to delete document from vector store' });
    }
  });

  // Document category API routes
  app.get('/api/document-categories', authMiddleware, async (req, res) => {
    try {
      const categories = await storage.getDocumentCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error fetching document categories:', error);
      res.status(500).json({ error: 'Failed to fetch document categories' });
    }
  });

  // Legacy route removed - subcategories no longer used

  app.post('/api/document-categories', authMiddleware, async (req, res) => {
    try {
      const { name, description, icon = '📄' } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const category = await storage.createDocumentCategory({
        name,
        description,
        icon,
        isSystem: false,
        isActive: true
      });
      
      res.json(category);
    } catch (error) {
      console.error('Error creating document category:', error);
      res.status(500).json({ error: 'Failed to create document category' });
    }
  });

  // Multiple categories per document routes
  app.post('/api/documents/:documentId/categories', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const { categoryId, customCategoryName } = req.body;
      
      if (!categoryId) {
        return res.status(400).json({ error: 'Category ID is required' });
      }

      const association = await storage.createDocumentCategoryAssociation(
        documentId,
        parseInt(categoryId),
        customCategoryName
      );
      
      res.json(association);
    } catch (error) {
      console.error('Error creating document category association:', error);
      res.status(500).json({ error: 'Failed to add category to document' });
    }
  });

  app.get('/api/documents/:documentId/categories', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const associations = await storage.getDocumentCategoryAssociations(documentId);
      res.json(associations);
    } catch (error) {
      console.error('Error fetching document categories:', error);
      res.status(500).json({ error: 'Failed to fetch document categories' });
    }
  });

  app.delete('/api/documents/:documentId/categories/:categoryId', authMiddleware, async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      const categoryId = parseInt(req.params.categoryId);
      
      await storage.deleteDocumentCategoryAssociation(documentId, categoryId);
      res.json({ message: 'Category removed from document successfully' });
    } catch (error) {
      console.error('Error removing document category:', error);
      res.status(500).json({ error: 'Failed to remove category from document' });
    }
  });

  // New Web Search endpoint as requested - POST /api/search/web
  app.post('/api/search/web', authMiddleware, async (req, res) => {
    try {
      console.log('=== POST /api/search/web ENDPOINT HIT ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      console.log('User ID:', req.userId);
      
      const { requestId, query } = req.body;
      
      if (!requestId || !query || typeof query !== 'string') {
        console.log('❌ Validation failed - missing requestId or query');
        return res.status(400).json({ 
          error: 'Missing required fields: requestId, query',
          message: 'Invalid request format' 
        });
      }
      
      // Import web search service
      const { webSearchService } = await import('./services/webSearchService');
      
      // Process web search query using investment_request as default type
      const result = await webSearchService.processWebSearchQuery(
        'investment_request',
        parseInt(requestId),
        req.userId!,
        query
      );
      
      if (!result.success) {
        return res.status(400).json({ 
          error: result.error,
          message: 'Failed to process web search query' 
        });
      }
      
      console.log('✅ Web search successful');
      res.json({
        answer: result.answer,
        responseId: result.responseId || undefined,
        success: true
      });
      
    } catch (error) {
      console.error('❌ POST /api/search/web failed:', error);
      res.status(500).json({ 
        error: 'Failed to process web search query',
        message: error.message 
      });
    }
  });

  // Template CRUD routes
  app.post('/api/templates', authMiddleware, async (req, res) => {
    try {
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate({
        ...templateData,
        createdBy: req.userId!,
      });
      res.json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ message: 'Failed to create template' });
    }
  });

  app.put('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertTemplateSchema.partial().parse(req.body);
      const template = await storage.updateTemplate(id, updateData);
      res.json(template);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ message: 'Failed to update template' });
    }
  });

  app.delete('/api/templates/:id', authMiddleware, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTemplate(id);
      res.json({ message: 'Template deleted successfully' });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ message: 'Failed to delete template' });
    }
  });

  // Investment rationale routes
  app.get('/api/investments/:id/rationales', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const rationales = await storage.getInvestmentRationales(investmentId);
      res.json(rationales);
    } catch (error) {
      console.error('Error fetching rationales:', error);
      res.status(500).json({ message: 'Failed to fetch rationales' });
    }
  });

  app.post('/api/investments/:id/rationales', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const rationaleData = insertInvestmentRationaleSchema.parse({
        ...req.body,
        investmentId,
        authorId: req.userId!
      });
      
      const rationale = await storage.createInvestmentRationale(rationaleData);
      res.json(rationale);
    } catch (error) {
      console.error('Error creating rationale:', error);
      res.status(500).json({ message: 'Failed to create rationale' });
    }
  });

  app.put('/api/investments/:id/rationales/:rationaleId', authMiddleware, async (req, res) => {
    try {
      const rationaleId = parseInt(req.params.rationaleId);
      const updateData = {
        content: req.body.content,
        updatedAt: new Date()
      };
      
      const rationale = await storage.updateInvestmentRationale(rationaleId, updateData);
      res.json(rationale);
    } catch (error) {
      console.error('Error updating rationale:', error);
      res.status(500).json({ message: 'Failed to update rationale' });
    }
  });

  app.delete('/api/investments/:id/rationales/:rationaleId', authMiddleware, async (req, res) => {
    try {
      const rationaleId = parseInt(req.params.rationaleId);
      await storage.deleteInvestmentRationale(rationaleId);
      res.json({ message: 'Rationale deleted successfully' });
    } catch (error) {
      console.error('Error deleting rationale:', error);
      res.status(500).json({ message: 'Failed to delete rationale' });
    }
  });

  // AI rationale generation route
  app.post('/api/investments/:id/rationales/generate', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const { templateId } = req.body;
      
      // Get template and investment details
      const template = await storage.getTemplate(templateId);
      const investment = await storage.getInvestmentRequest(investmentId);
      
      if (!template || !investment) {
        return res.status(404).json({ message: 'Template or investment not found' });
      }
      
      // For now, create a placeholder AI-generated rationale
      // In production, this would integrate with the LLM service
      const aiContent = `AI-Generated Investment Rationale for ${investment.targetCompany}

This analysis is generated using the "${template.name}" template for ${investment.investmentType} investments.

Investment Overview:
- Target Company: ${investment.targetCompany}
- Investment Amount: $${parseFloat(investment.amount).toLocaleString()}
- Expected Return: ${investment.expectedReturn}%
- Risk Level: ${investment.riskLevel}

Financial Analysis:
Based on the provided investment parameters, this ${investment.investmentType} investment in ${investment.targetCompany} presents a balanced opportunity with expected returns of ${investment.expectedReturn}%. The risk profile is classified as ${investment.riskLevel}, indicating appropriate due diligence requirements.

Risk Assessment:
The investment carries ${investment.riskLevel} risk characteristics. Key risk factors include market volatility, sector-specific challenges, and regulatory considerations. Mitigation strategies should be implemented accordingly.

Investment Recommendation:
This investment aligns with portfolio diversification objectives and meets the return threshold requirements. The risk-adjusted return profile justifies the allocation of $${parseFloat(investment.amount).toLocaleString()}.

Strategic Fit:
The investment supports long-term portfolio growth objectives and provides exposure to the ${investment.investmentType} asset class.

Note: This is an AI-generated analysis based on the selected template structure. For production deployment, this would integrate with advanced LLM services for comprehensive market analysis and detailed financial modeling.`;

      const rationaleData = {
        investmentId,
        templateId,
        content: aiContent,
        type: 'ai_generated' as const,
        authorId: req.userId!,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const rationale = await storage.createInvestmentRationale(rationaleData);
      res.json(rationale);
    } catch (error) {
      console.error('Error generating AI rationale:', error);
      res.status(500).json({ message: 'Failed to generate AI rationale' });
    }
  });

  // Comprehensive AI rationale generation route
  app.post('/api/investments/:id/rationales/generate-comprehensive', authMiddleware, async (req, res) => {
    try {
      const investmentId = parseInt(req.params.id);
      const { templateId } = req.body;
      
      // Import the service
      const { comprehensiveProposalService } = await import('./services/comprehensiveProposalService');
      
      // Generate comprehensive proposal
      const result = await comprehensiveProposalService.generateComprehensiveProposal({
        investmentId,
        templateId,
        userId: req.userId!
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error generating comprehensive proposal:', error);
      res.status(500).json({ 
        message: 'Failed to generate comprehensive proposal',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ============================================================================
  // LAMS API Routes
  // ============================================================================

  // SIA Routes
  app.post('/api/lams/sia', authMiddleware, async (req, res) => {
    try {
      const sia = await siaService.createSia(req.body, req.userId!);
      res.json(sia);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating SIA' });
    }
  });

  app.get('/api/lams/sia', authMiddleware, async (req, res) => {
    try {
      const { status, createdBy } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (createdBy) filters.createdBy = parseInt(createdBy as string);
      const sias = await siaService.getSias(filters);
      res.json(sias);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching SIAs' });
    }
  });

  app.get('/api/lams/sia/:id', authMiddleware, async (req, res) => {
    try {
      const sia = await siaService.getSiaWithDetails(parseInt(req.params.id));
      res.json(sia);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'SIA not found' });
    }
  });

  app.put('/api/lams/sia/:id', authMiddleware, async (req, res) => {
    try {
      const sia = await siaService.updateSia(parseInt(req.params.id), req.body, req.userId!);
      res.json(sia);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating SIA' });
    }
  });

  app.post('/api/lams/sia/:id/publish', authMiddleware, async (req, res) => {
    try {
      const sia = await siaService.publishSia(parseInt(req.params.id), req.userId!);
      res.json(sia);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error publishing SIA' });
    }
  });

  app.post('/api/lams/sia/:id/feedback', async (req, res) => {
    try {
      // Public endpoint - no auth required for citizen feedback
      // Map frontend fields to backend schema
      const { name, phone, email, feedback } = req.body;
      
      if (!name || !phone || !feedback) {
        return res.status(400).json({ message: 'Name, phone, and feedback are required' });
      }
      
      // Combine phone and email for citizenContact (prefer phone, add email if provided)
      const citizenContact = email ? `${phone}, ${email}` : phone;
      
      const feedbackData = {
        citizenName: name,
        citizenContact: citizenContact,
        text: feedback,
      };
      
      const feedbackResult = await siaService.submitFeedback(parseInt(req.params.id), feedbackData);
      res.json(feedbackResult);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting feedback' });
    }
  });

  // ============================================================================
  // Public API Routes (No Authentication Required)
  // ============================================================================

  // Citizen OTP Authentication
  app.post('/api/public/auth/send-otp', async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
      }
      const result = await authService.sendOTP(phone);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  });

  app.post('/api/public/auth/verify-otp', async (req, res) => {
    try {
      const { phone, otp, userData } = req.body;
      if (!phone || !otp) {
        return res.status(400).json({ message: 'Phone number and OTP are required' });
      }
      const result = await authService.verifyOTP(phone, otp, userData);
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }
      
      // Set session
      req.session.userId = result.user!.id;
      req.session.userRole = result.user!.role;
      
      res.json({ user: result.user, message: 'OTP verified successfully' });
    } catch (error) {
      res.status(500).json({ message: 'OTP verification failed' });
    }
  });

  // Public SIA List (published SIAs only)
  app.get('/api/public/sia', async (req, res) => {
    try {
      const sias = await siaService.getSias({ status: 'published' });
      res.json(sias);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching published SIAs' });
    }
  });

  app.get('/api/public/sia/:id', async (req, res) => {
    try {
      const sia = await siaService.getSiaWithDetails(parseInt(req.params.id));
      // Only return if published
      if (sia.status !== 'published') {
        return res.status(404).json({ message: 'SIA not found' });
      }
      res.json(sia);
    } catch (error) {
      res.status(404).json({ message: 'SIA not found' });
    }
  });

  const PUBLIC_NOTIFICATION_STATUSES = ['published', 'objection_window_open', 'objection_resolved'];

  // Public Land Notifications (published notifications + objection window)
  app.get('/api/public/notifications', async (req, res) => {
    try {
      const notifications = await landNotificationService.getNotifications();
      const publicNotifications = notifications.filter(notification =>
        PUBLIC_NOTIFICATION_STATUSES.includes(notification.status)
      );
      res.json(publicNotifications);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching published notifications' });
    }
  });

  app.get('/api/public/notifications/:id', async (req, res) => {
    try {
      const notification = await landNotificationService.getNotificationWithDetails(parseInt(req.params.id));
      if (!PUBLIC_NOTIFICATION_STATUSES.includes(notification.status)) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      res.json(notification);
    } catch (error) {
      res.status(404).json({ message: 'Notification not found' });
    }
  });

  // Public Document Verification (via QR code hash)
  app.get('/api/public/documents/verify/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      // Find document by hash (stored in documents table or separate verification table)
      // For now, we'll search through published documents
      const documents = await storage.getDocumentsByRequest('land_notification', 0); // This needs to be updated
      // In production, add a hash field to documents or create a verification table
      res.json({ verified: false, message: 'Document verification not yet implemented' });
    } catch (error) {
      res.status(500).json({ message: 'Document verification failed' });
    }
  });

  const MAX_OBJECTION_ATTACHMENTS = 3;
  const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

  const cleanupUploadedFiles = (files?: Express.Multer.File[] | Express.Multer.File) => {
    if (!files) return;
    const list = Array.isArray(files) ? files : [files];
    for (const file of list) {
      fs.unlink(file.path, () => {});
    }
  };

  // Public Objection Submission (supports attachments)
  app.post('/api/public/objections', fileUpload.array('attachments', MAX_OBJECTION_ATTACHMENTS), async (req, res) => {
    const files = req.files as Express.Multer.File[] | undefined;
    try {
      const {
        notificationId,
        parcelId,
        text,
        name,
        phone,
        email,
        aadhaar,
      } = req.body;

      if (!notificationId || !parcelId || !text || !name || !phone) {
        cleanupUploadedFiles(files);
        return res.status(400).json({ message: 'Notification, parcel, name, phone, and objection text are required' });
      }

      if (files && files.length > MAX_OBJECTION_ATTACHMENTS) {
        cleanupUploadedFiles(files);
        return res.status(400).json({ message: `Maximum ${MAX_OBJECTION_ATTACHMENTS} attachments are allowed` });
      }

      if (files?.some(file => file.size > MAX_ATTACHMENT_SIZE_BYTES)) {
        cleanupUploadedFiles(files);
        return res.status(400).json({ message: 'Each attachment must be 25MB or smaller' });
      }

      const attachments = files?.map(file => ({
        path: file.path,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      }));

      const objection = await objectionService.submitObjection({
        notificationId: parseInt(notificationId),
        parcelId: parseInt(parcelId),
        text,
        submittedByName: name,
        submittedByPhone: phone,
        submittedByEmail: email || null,
        submittedByAadhaar: aadhaar || null,
        attachmentsJson: attachments ?? null,
      });
      res.json(objection);
    } catch (error) {
      cleanupUploadedFiles(files);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting objection' });
    }
  });

  // Authenticated file upload helper for officer workflows
  app.post('/api/uploads', authMiddleware, fileUpload.single('file'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'File is required' });
      }
      const fileBuffer = fs.readFileSync(file.path);
      const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      let gpsLat: number | null = null;
      let gpsLng: number | null = null;
      let metadataSource: 'exif' | null = null;
      try {
        const gpsData = await exifr.gps(file.path);
        if (
          gpsData &&
          typeof gpsData.latitude === 'number' &&
          typeof gpsData.longitude === 'number'
        ) {
          gpsLat = Number(gpsData.latitude.toFixed(7));
          gpsLng = Number(gpsData.longitude.toFixed(7));
          metadataSource = 'exif';
        }
      } catch (error) {
        console.warn('Unable to parse EXIF data for upload', error);
      }
      res.json({
        path: file.path,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        hash,
        gpsLat,
        gpsLng,
        metadataSource,
      });
    } catch (error) {
      res.status(500).json({ message: 'File upload failed' });
    }
  });

  app.post('/api/lams/sia/:id/hearings', authMiddleware, async (req, res) => {
    try {
      const hearing = await siaService.scheduleHearing(parseInt(req.params.id), req.body, req.userId!);
      res.json(hearing);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling hearing' });
    }
  });

  app.put('/api/lams/sia/hearings/:id/complete', authMiddleware, async (req, res) => {
    try {
      const { minutesPath, attendees } = req.body;
      const hearing = await siaService.completeHearing(
        parseInt(req.params.id),
        minutesPath,
        attendees,
        req.userId!
      );
      res.json(hearing);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing hearing' });
    }
  });

  app.post('/api/lams/sia/:id/generate-report', authMiddleware, async (req, res) => {
    try {
      const report = await siaService.generateReport(parseInt(req.params.id), req.userId!);
      res.json(report);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error generating report' });
    }
  });

  app.post('/api/lams/sia/:id/close', authMiddleware, async (req, res) => {
    try {
      const sia = await siaService.closeSia(parseInt(req.params.id), req.userId!);
      res.json(sia);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error closing SIA' });
    }
  });

  // Land Notification Routes (Sec 11/19)
  app.post('/api/lams/notifications', authMiddleware, async (req, res) => {
    try {
      const { notificationData, parcelIds } = req.body;
      
      // Validate at least one parcel is selected
      if (!parcelIds || !Array.isArray(parcelIds) || parcelIds.length === 0) {
        return res.status(400).json({ message: 'At least one parcel must be selected' });
      }
      
      const notification = await landNotificationService.createNotification(
        notificationData,
        parcelIds,
        req.userId!
      );
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating notification' });
    }
  });

  app.get('/api/lams/notifications', authMiddleware, async (req, res) => {
    try {
      const { type, status } = req.query;
      const filters: any = {};
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      const notifications = await landNotificationService.getNotifications(filters);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching notifications' });
    }
  });

  app.get('/api/lams/notifications/:id', authMiddleware, async (req, res) => {
    try {
      const notification = await landNotificationService.getNotificationWithDetails(parseInt(req.params.id));
      res.json(notification);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Notification not found' });
    }
  });

  app.put('/api/lams/notifications/:id', authMiddleware, async (req, res) => {
    try {
      const { notificationData, parcelIds } = req.body;
      const notification = await landNotificationService.updateNotification(
        parseInt(req.params.id),
        notificationData,
        req.userId!,
        parcelIds
      );
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating notification' });
    }
  });

  app.post('/api/lams/notifications/:id/submit-legal', authMiddleware, async (req, res) => {
    try {
      const notification = await landNotificationService.submitForLegalReview(
        parseInt(req.params.id),
        req.userId!
      );
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting for review' });
    }
  });

  app.post('/api/lams/notifications/:id/approve', authMiddleware, async (req, res) => {
    try {
      const { comments } = req.body;
      const notification = await landNotificationService.approveNotification(
        parseInt(req.params.id),
        req.userId!,
        comments
      );
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving notification' });
    }
  });

  app.post('/api/lams/notifications/:id/publish', authMiddleware, async (req, res) => {
    try {
      const { publishDate, notifyChannels } = req.body;
      const notification = await landNotificationService.publishNotification(
        parseInt(req.params.id),
        new Date(publishDate),
        req.userId!,
        { notifyChannels }
      );
      res.json(notification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error publishing notification' });
    }
  });

  app.post('/api/lams/notifications/:id/preview', authMiddleware, async (req, res) => {
    try {
      const { publishDate } = req.body;
      const preview = await landNotificationService.previewNotification(
        parseInt(req.params.id),
        new Date(publishDate || new Date())
      );
      const relativePath = path.relative(process.cwd(), preview.filePath);
      res.json({
        ...preview,
        previewUrl: `/${relativePath.replace(/\\/g, '/')}`,
      });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error generating preview' });
    }
  });

  // Objection Routes
  app.post('/api/lams/objections', async (req, res) => {
    try {
      // Public endpoint - citizens can submit objections
      // Support both { objectionData, userId } and direct objectionData
      const objectionData = req.body.objectionData || req.body;
      const userId = req.body.userId;
      const objection = await objectionService.submitObjection(objectionData, userId);
      res.json(objection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting objection' });
    }
  });

  app.get('/api/lams/objections', authMiddleware, async (req, res) => {
    try {
      const { notificationId, status } = req.query;
      const filters: any = {};
      if (notificationId) filters.notificationId = parseInt(notificationId as string);
      if (status) filters.status = status as string;
      const objections = await objectionService.getObjections(filters);
      res.json(objections);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching objections' });
    }
  });

  app.get('/api/lams/objections/:id', authMiddleware, async (req, res) => {
    try {
      const objection = await objectionService.getObjectionWithDetails(parseInt(req.params.id));
      res.json(objection);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Objection not found' });
    }
  });

  app.post('/api/lams/objections/:id/resolve', authMiddleware, async (req, res) => {
    try {
      const { resolutionText, status } = req.body;
      
      // Validate resolution text is provided
      if (!resolutionText || typeof resolutionText !== 'string' || resolutionText.trim().length === 0) {
        return res.status(400).json({ message: 'Resolution text is required' });
      }
      
      // Validate status
      if (!status || !['resolved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status must be either "resolved" or "rejected"' });
      }
      
      const objection = await objectionService.resolveObjection(
        parseInt(req.params.id),
        resolutionText,
        status,
        req.userId!
      );
      res.json(objection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error resolving objection' });
    }
  });

  app.get('/api/lams/notifications/:id/unresolved-objections', authMiddleware, async (req, res) => {
    try {
      const objections = await objectionService.getUnresolvedObjections(parseInt(req.params.id));
      res.json(objections);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching unresolved objections' });
    }
  });

  // Parcel Routes (for LAMS)
  app.get('/api/lams/parcels', authMiddleware, async (req, res) => {
    try {
      const { status, district } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (district) filters.district = district as string;
      const parcels = await storage.getParcels(filters);
      res.json(parcels);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching parcels' });
    }
  });

  app.get('/api/lams/parcels/:id', authMiddleware, async (req, res) => {
    try {
      const parcel = await storage.getParcel(parseInt(req.params.id));
      if (!parcel) {
        return res.status(404).json({ message: 'Parcel not found' });
      }
      res.json(parcel);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching parcel' });
    }
  });

  app.post('/api/lams/parcels', authMiddleware, async (req, res) => {
    try {
      const parcel = await storage.createParcel(req.body);
      res.json(parcel);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating parcel' });
    }
  });

  app.get('/api/lams/parcels/:id/owners', authMiddleware, async (req, res) => {
    try {
      const parcelId = parseInt(req.params.id);
      const parcelOwners = await storage.getParcelOwners(parcelId);
      res.json(parcelOwners);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching parcel owners' });
    }
  });

  app.post('/api/lams/parcels/:id/owners', authMiddleware, async (req, res) => {
    try {
      const parcelId = parseInt(req.params.id);
      const { ownerId, sharePct } = req.body;
      
      // Check if relationship already exists
      const existing = await storage.getParcelOwners(parcelId);
      const existingOwner = existing.find(po => po.ownerId === ownerId);
      if (existingOwner) {
        return res.status(400).json({ message: 'Owner already has a share in this parcel' });
      }
      
      // Check total share percentage
      const totalShare = existing.reduce((sum, po) => sum + Number(po.sharePct), 0);
      if (totalShare + Number(sharePct) > 100) {
        return res.status(400).json({ message: 'Total share percentage cannot exceed 100%' });
      }
      
      const parcelOwner = await storage.createParcelOwner({
        parcelId,
        ownerId,
        sharePct: String(sharePct),
      });
      res.json(parcelOwner);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating parcel-owner relationship' });
    }
  });

  app.put('/api/lams/parcels/:id', authMiddleware, async (req, res) => {
    try {
      const parcel = await storage.updateParcel(parseInt(req.params.id), req.body);
      res.json(parcel);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating parcel' });
    }
  });

  // Owner Routes (for LAMS)
  app.get('/api/lams/owners', authMiddleware, async (req, res) => {
    try {
      const { name } = req.query;
      const filters: any = {};
      if (name) filters.name = name as string;
      const owners = await storage.getOwners(filters);
      res.json(owners);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching owners' });
    }
  });

  app.post('/api/lams/owners', authMiddleware, async (req, res) => {
    try {
      const owner = await storage.createOwner(req.body);
      res.json(owner);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating owner' });
    }
  });

  // ============================================================================
  // Compensation & Award Routes
  // ============================================================================

  // Valuation Routes
  app.post('/api/lams/valuations', authMiddleware, async (req, res) => {
    try {
      const valuation = await compensationService.createValuation(req.body, req.userId!);
      res.json(valuation);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating valuation' });
    }
  });

  app.get('/api/lams/valuations', authMiddleware, async (req, res) => {
    try {
      const { parcelId } = req.query;
      const filters: any = {};
      if (parcelId) filters.parcelId = parseInt(parcelId as string);
      const valuations = await storage.getValuations(filters);
      res.json(valuations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching valuations' });
    }
  });

  app.get('/api/lams/valuations/:id', authMiddleware, async (req, res) => {
    try {
      const valuation = await storage.getValuation(parseInt(req.params.id));
      if (!valuation) {
        return res.status(404).json({ message: 'Valuation not found' });
      }
      res.json(valuation);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching valuation' });
    }
  });

  app.get('/api/lams/parcels/:id/valuation', authMiddleware, async (req, res) => {
    try {
      const valuation = await storage.getValuationByParcel(parseInt(req.params.id));
      if (!valuation) {
        return res.status(404).json({ message: 'Valuation not found for this parcel' });
      }
      res.json(valuation);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching valuation' });
    }
  });

  app.put('/api/lams/valuations/:id', authMiddleware, async (req, res) => {
    try {
      const valuation = await storage.updateValuation(parseInt(req.params.id), req.body);
      res.json(valuation);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating valuation' });
    }
  });

  // Award Routes
  app.post('/api/lams/awards', authMiddleware, async (req, res) => {
    try {
      const award = await compensationService.createAward(req.body, req.userId!);
      res.json(award);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating award' });
    }
  });

  app.get('/api/lams/awards', authMiddleware, async (req, res) => {
    try {
      const { parcelId, ownerId, status } = req.query;
      const filters: any = {};
      if (parcelId) filters.parcelId = parseInt(parcelId as string);
      if (ownerId) filters.ownerId = parseInt(ownerId as string);
      if (status) filters.status = status as string;
      const awards = await compensationService.getAwards(filters);
      res.json(awards);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching awards' });
    }
  });

  app.get('/api/lams/awards/:id', authMiddleware, async (req, res) => {
    try {
      const award = await compensationService.getAwardWithDetails(parseInt(req.params.id));
      res.json(award);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Award not found' });
    }
  });

  app.post('/api/lams/awards/:id/submit-finance', authMiddleware, async (req, res) => {
    try {
      const award = await compensationService.submitForFinanceReview(parseInt(req.params.id), req.userId!);
      res.json(award);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting for finance review' });
    }
  });

  app.post('/api/lams/awards/:id/approve', authMiddleware, async (req, res) => {
    try {
      const { comments } = req.body;
      const award = await compensationService.approveAward(parseInt(req.params.id), req.userId!, comments);
      res.json(award);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving award' });
    }
  });

  app.post('/api/lams/awards/:id/close', authMiddleware, async (req, res) => {
    try {
      const award = await compensationService.closeAward(parseInt(req.params.id), req.userId!);
      res.json(award);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error closing award' });
    }
  });

  // Payment Routes
  app.post('/api/lams/payments', authMiddleware, async (req, res) => {
    try {
      const payment = await compensationService.recordPayment(req.body, req.userId!);
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error recording payment' });
    }
  });

  app.get('/api/lams/payments', authMiddleware, async (req, res) => {
    try {
      const { awardId, status } = req.query;
      const filters: any = {};
      if (awardId) filters.awardId = parseInt(awardId as string);
      if (status) filters.status = status as string;
      const payments = await storage.getPayments(filters);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching payments' });
    }
  });

  app.get('/api/lams/payments/:id', authMiddleware, async (req, res) => {
    try {
      const payment = await storage.getPayment(parseInt(req.params.id));
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching payment' });
    }
  });

  app.get('/api/lams/awards/:id/payments', authMiddleware, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByAward(parseInt(req.params.id));
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching payments' });
    }
  });

  app.put('/api/lams/payments/:id', authMiddleware, async (req, res) => {
    try {
      const payment = await storage.updatePayment(parseInt(req.params.id), req.body);
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating payment' });
    }
  });

  // ============================================================================
  // Possession Routes
  // ============================================================================

  app.post('/api/lams/possession', authMiddleware, async (req, res) => {
    try {
      const possession = await possessionService.schedulePossession(req.body, req.userId!);
      res.json(possession);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling possession' });
    }
  });

  app.get('/api/lams/possession', authMiddleware, async (req, res) => {
    try {
      const { parcelId, status } = req.query;
      const filters: any = {};
      if (parcelId) filters.parcelId = parseInt(parcelId as string);
      if (status) filters.status = status as string;
      const possessions = await possessionService.getPossessions(filters);
      res.json(possessions);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching possessions' });
    }
  });

  app.get('/api/lams/possession/:id', authMiddleware, async (req, res) => {
    try {
      const possession = await possessionService.getPossessionWithDetails(parseInt(req.params.id));
      res.json(possession);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Possession not found' });
    }
  });

  app.get('/api/lams/parcels/:id/possession', authMiddleware, async (req, res) => {
    try {
      const possession = await storage.getPossessionByParcel(parseInt(req.params.id));
      if (!possession) {
        return res.status(404).json({ message: 'Possession not found for this parcel' });
      }
      res.json(possession);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching possession' });
    }
  });

  app.post('/api/lams/possession/:id/start', authMiddleware, async (req, res) => {
    try {
      const possession = await possessionService.startPossession(parseInt(req.params.id), req.userId!);
      res.json(possession);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error starting possession' });
    }
  });

  app.post('/api/lams/possession/:id/evidence', authMiddleware, async (req, res) => {
    try {
      const { mediaData } = req.body;
      const possession = await possessionService.uploadEvidence(
        parseInt(req.params.id),
        mediaData,
        req.userId!
      );
      res.json(possession);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error uploading evidence' });
    }
  });

  app.post('/api/lams/possession/:id/certificate', authMiddleware, async (req, res) => {
    try {
      const possession = await possessionService.generateCertificate(parseInt(req.params.id), req.userId!);
      res.json(possession);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error generating certificate' });
    }
  });

  app.post('/api/lams/possession/:id/update-registry', authMiddleware, async (req, res) => {
    try {
      const possession = await possessionService.updateRegistry(parseInt(req.params.id), req.userId!);
      res.json(possession);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating registry' });
    }
  });

  app.post('/api/lams/possession/:id/close', authMiddleware, async (req, res) => {
    try {
      const possession = await possessionService.closePossession(parseInt(req.params.id), req.userId!);
      res.json(possession);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error closing possession' });
    }
  });

  app.get('/api/lams/possession/:id/media', authMiddleware, async (req, res) => {
    try {
      const media = await storage.getPossessionMedia(parseInt(req.params.id));
      res.json(media);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching possession media' });
    }
  });

  app.delete('/api/lams/possession/media/:id', authMiddleware, async (req, res) => {
    try {
      await storage.deletePossessionMedia(parseInt(req.params.id));
      res.json({ message: 'Media deleted successfully' });
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error deleting media' });
    }
  });

  // ============================================================================
  // Reports Routes (Phase 5)
  // ============================================================================

  app.get('/api/reports/operational', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, district, taluka, status, type } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (district) filters.district = district as string;
      if (taluka) filters.taluka = taluka as string;
      if (status) filters.status = status as string;
      if (type) filters.type = type as string;
      
      const report = await reportsService.generateOperationalReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating operational report' });
    }
  });

  app.get('/api/reports/financial', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status as string;
      
      const report = await reportsService.generateFinancialReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating financial report' });
    }
  });

  app.get('/api/reports/compliance', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const report = await reportsService.generateComplianceReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating compliance report' });
    }
  });

  // ============================================================================
  // Property Management System (PMS) API Routes
  // ============================================================================

  // Party routes
  app.post('/api/property-management/parties', authMiddleware, async (req, res) => {
    try {
      const party = await partyService.createParty(req.body);
      res.json(party);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating party' });
    }
  });

  app.get('/api/property-management/parties', authMiddleware, async (req, res) => {
    try {
      const { name, phone, aadhaar } = req.query;
      const filters: any = {};
      if (name) filters.name = name as string;
      if (phone) filters.phone = phone as string;
      if (aadhaar) filters.aadhaar = aadhaar as string;
      const parties = await partyService.getParties(filters);
      res.json(parties);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching parties' });
    }
  });

  app.get('/api/property-management/parties/:id', authMiddleware, async (req, res) => {
    try {
      const party = await partyService.getParty(parseInt(req.params.id));
      res.json(party);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Party not found' });
    }
  });

  app.put('/api/property-management/parties/:id', authMiddleware, async (req, res) => {
    try {
      const party = await partyService.updateParty(parseInt(req.params.id), req.body);
      res.json(party);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating party' });
    }
  });

  // Scheme routes
  app.post('/api/property-management/schemes', authMiddleware, async (req, res) => {
    try {
      const scheme = await schemeService.createScheme(req.body, req.userId!);
      res.json(scheme);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating scheme' });
    }
  });

  app.get('/api/property-management/schemes', authMiddleware, async (req, res) => {
    try {
      const { status, createdBy } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (createdBy) filters.createdBy = parseInt(createdBy as string);
      const schemes = await schemeService.getSchemes(filters);
      res.json(schemes);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching schemes' });
    }
  });

  app.get('/api/property-management/schemes/:id', authMiddleware, async (req, res) => {
    try {
      const scheme = await schemeService.getScheme(parseInt(req.params.id));
      res.json(scheme);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Scheme not found' });
    }
  });

  app.put('/api/property-management/schemes/:id', authMiddleware, async (req, res) => {
    try {
      const scheme = await schemeService.updateScheme(parseInt(req.params.id), req.body, req.userId!);
      res.json(scheme);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating scheme' });
    }
  });

  // Property routes
  app.post('/api/property-management/properties', authMiddleware, async (req, res) => {
    try {
      const property = await propertyService.createProperty(req.body);
      res.json(property);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating property' });
    }
  });

  app.get('/api/property-management/properties', authMiddleware, async (req, res) => {
    try {
      const { schemeId, status } = req.query;
      const filters: any = {};
      if (schemeId) filters.schemeId = parseInt(schemeId as string);
      if (status) filters.status = status as string;
      const properties = await propertyService.getProperties(filters);
      res.json(properties);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching properties' });
    }
  });

  app.get('/api/property-management/properties/:id', authMiddleware, async (req, res) => {
    try {
      const property = await propertyService.getPropertyWithOwnership(parseInt(req.params.id));
      res.json(property);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Property not found' });
    }
  });

  app.put('/api/property-management/properties/:id', authMiddleware, async (req, res) => {
    try {
      const property = await propertyService.updateProperty(parseInt(req.params.id), req.body);
      res.json(property);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating property' });
    }
  });

  app.post('/api/property-management/properties/:id/ownership', authMiddleware, async (req, res) => {
    try {
      const ownership = await propertyService.addOwnership(parseInt(req.params.id), req.body);
      res.json(ownership);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error adding ownership' });
    }
  });

  // Application routes
  app.post('/api/property-management/schemes/:id/applications', authMiddleware, async (req, res) => {
    try {
      const application = await schemeService.submitApplication({
        ...req.body,
        schemeId: parseInt(req.params.id),
      });
      res.json(application);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting application' });
    }
  });

  app.get('/api/property-management/schemes/:id/applications', authMiddleware, async (req, res) => {
    try {
      const { status } = req.query;
      const applications = await schemeService.getSchemeApplications(
        parseInt(req.params.id),
        status ? { status: status as string } : undefined
      );
      res.json(applications);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching applications' });
    }
  });

  app.post('/api/property-management/applications/:id/verify', authMiddleware, async (req, res) => {
    try {
      const application = await schemeService.verifyApplication(parseInt(req.params.id), req.userId!);
      res.json(application);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error verifying application' });
    }
  });

  app.post('/api/property-management/applications/:id/reject', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const application = await schemeService.rejectApplication(parseInt(req.params.id), reason || 'Not eligible', req.userId!);
      res.json(application);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error rejecting application' });
    }
  });

  // Draw routes
  app.post('/api/property-management/schemes/:id/draw', authMiddleware, async (req, res) => {
    try {
      const { selectedCount } = req.body;
      if (!selectedCount || selectedCount <= 0) {
        return res.status(400).json({ message: 'selectedCount is required and must be greater than 0' });
      }
      const drawResult = await drawService.conductDraw(parseInt(req.params.id), selectedCount, req.userId!);
      res.json(drawResult);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error conducting draw' });
    }
  });

  // Allotment routes
  app.post('/api/property-management/allotments', authMiddleware, async (req, res) => {
    try {
      const allotment = await allotmentService.createAllotment(req.body, req.userId!);
      res.json(allotment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating allotment' });
    }
  });

  app.get('/api/property-management/allotments', authMiddleware, async (req, res) => {
    try {
      const { propertyId, partyId, status } = req.query;
      const filters: any = {};
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (status) filters.status = status as string;
      const allotments = await storage.getAllotments(filters);
      res.json(allotments);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching allotments' });
    }
  });

  app.get('/api/property-management/allotments/:id', authMiddleware, async (req, res) => {
    try {
      const allotment = await allotmentService.getAllotmentWithDetails(parseInt(req.params.id));
      res.json(allotment);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Allotment not found' });
    }
  });

  app.post('/api/property-management/allotments/:id/issue', authMiddleware, async (req, res) => {
    try {
      const allotment = await allotmentService.issueAllotmentLetter(parseInt(req.params.id), req.userId!);
      res.json(allotment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error issuing allotment letter' });
    }
  });

  app.post('/api/property-management/allotments/:id/accept', authMiddleware, async (req, res) => {
    try {
      const allotment = await allotmentService.acceptAllotment(parseInt(req.params.id));
      res.json(allotment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error accepting allotment' });
    }
  });

  app.post('/api/property-management/allotments/:id/cancel', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const allotment = await allotmentService.cancelAllotment(parseInt(req.params.id), reason || 'Cancelled', req.userId!);
      res.json(allotment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error cancelling allotment' });
    }
  });

  // Public verification endpoint for allotment letters
  app.get('/api/public/property-management/allotments/verify/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      // Find allotment by hash
      const allotments = await storage.getAllotments({});
      const allotment = allotments.find(a => a.hashSha256 === hash);
      
      if (!allotment) {
        return res.status(404).json({ verified: false, message: 'Allotment not found' });
      }

      // Verify PDF integrity if file exists
      let pdfVerified = false;
      if (allotment.pdfPath) {
        const fs = await import('fs');
        const path = await import('path');
        const crypto = await import('crypto');
        
        const filePath = path.join(process.cwd(), allotment.pdfPath);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          pdfVerified = actualHash === hash;
        }
      }

      res.json({
        verified: true,
        pdfVerified,
        allotment: {
          letterNo: allotment.letterNo,
          issueDate: allotment.issueDate,
          status: allotment.status,
        },
      });
    } catch (error) {
      res.status(500).json({ verified: false, message: 'Verification failed' });
    }
  });

  // Enhanced scheme routes
  app.get('/api/property-management/schemes/:id', authMiddleware, async (req, res) => {
    try {
      const scheme = await schemeService.getSchemeWithDetails(parseInt(req.params.id));
      res.json(scheme);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Scheme not found' });
    }
  });

  // ============================================================================
  // PMS Phase 3 API Routes (Property Lifecycle & Post-Allotment)
  // ============================================================================

  // Transfer routes
  app.post('/api/property-management/properties/:id/transfers', authMiddleware, async (req, res) => {
    try {
      const transfer = await transferService.createTransfer({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(transfer);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating transfer' });
    }
  });

  app.get('/api/property-management/properties/:id/transfers', authMiddleware, async (req, res) => {
    try {
      const transfers = await transferService.getTransfers({ propertyId: parseInt(req.params.id) });
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching transfers' });
    }
  });

  app.post('/api/property-management/transfers/:id/submit', authMiddleware, async (req, res) => {
    try {
      const transfer = await transferService.submitForReview(parseInt(req.params.id), req.userId!);
      res.json(transfer);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting transfer' });
    }
  });

  app.post('/api/property-management/transfers/:id/approve', authMiddleware, async (req, res) => {
    try {
      const transfer = await transferService.approveTransfer(parseInt(req.params.id), req.userId!);
      res.json(transfer);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving transfer' });
    }
  });

  app.post('/api/property-management/transfers/:id/complete', authMiddleware, async (req, res) => {
    try {
      const transfer = await transferService.completeTransfer(parseInt(req.params.id), req.userId!);
      res.json(transfer);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing transfer' });
    }
  });

  app.post('/api/property-management/transfers/:id/reject', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const transfer = await transferService.rejectTransfer(parseInt(req.params.id), reason || 'Rejected', req.userId!);
      res.json(transfer);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error rejecting transfer' });
    }
  });

  // Mortgage routes
  app.post('/api/property-management/properties/:id/mortgages', authMiddleware, async (req, res) => {
    try {
      const mortgage = await mortgageService.createMortgage({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(mortgage);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating mortgage' });
    }
  });

  app.get('/api/property-management/properties/:id/mortgages', authMiddleware, async (req, res) => {
    try {
      const mortgages = await mortgageService.getMortgages({ propertyId: parseInt(req.params.id) });
      res.json(mortgages);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching mortgages' });
    }
  });

  app.post('/api/property-management/mortgages/:id/submit', authMiddleware, async (req, res) => {
    try {
      const mortgage = await mortgageService.submitForReview(parseInt(req.params.id), req.userId!);
      res.json(mortgage);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting mortgage' });
    }
  });

  app.post('/api/property-management/mortgages/:id/approve', authMiddleware, async (req, res) => {
    try {
      const mortgage = await mortgageService.approveMortgage(parseInt(req.params.id), req.userId!);
      res.json(mortgage);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving mortgage' });
    }
  });

  app.post('/api/property-management/mortgages/:id/close', authMiddleware, async (req, res) => {
    try {
      const mortgage = await mortgageService.closeMortgage(parseInt(req.params.id), req.userId!);
      res.json(mortgage);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error closing mortgage' });
    }
  });

  app.post('/api/property-management/mortgages/:id/reject', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const mortgage = await mortgageService.rejectMortgage(parseInt(req.params.id), reason || 'Rejected', req.userId!);
      res.json(mortgage);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error rejecting mortgage' });
    }
  });

  // Modification routes
  app.post('/api/property-management/properties/:id/modifications', authMiddleware, async (req, res) => {
    try {
      const modification = await modificationService.createModification({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(modification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating modification' });
    }
  });

  app.get('/api/property-management/properties/:id/modifications', authMiddleware, async (req, res) => {
    try {
      const modifications = await modificationService.getModifications({ propertyId: parseInt(req.params.id) });
      res.json(modifications);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching modifications' });
    }
  });

  app.post('/api/property-management/modifications/:id/submit', authMiddleware, async (req, res) => {
    try {
      const modification = await modificationService.submitForReview(parseInt(req.params.id), req.userId!);
      res.json(modification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting modification' });
    }
  });

  app.post('/api/property-management/modifications/:id/approve', authMiddleware, async (req, res) => {
    try {
      const modification = await modificationService.approveModification(parseInt(req.params.id), req.userId!);
      res.json(modification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving modification' });
    }
  });

  app.post('/api/property-management/modifications/:id/reject', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const modification = await modificationService.rejectModification(parseInt(req.params.id), reason || 'Rejected', req.userId!);
      res.json(modification);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error rejecting modification' });
    }
  });

  // NOC routes
  app.post('/api/property-management/properties/:id/nocs', authMiddleware, async (req, res) => {
    try {
      const noc = await nocService.createNOC({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(noc);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating NOC' });
    }
  });

  app.get('/api/property-management/properties/:id/nocs', authMiddleware, async (req, res) => {
    try {
      const { type, status } = req.query;
      const filters: any = { propertyId: parseInt(req.params.id) };
      if (type) filters.type = type as string;
      if (status) filters.status = status as string;
      const nocs = await nocService.getNOCs(filters);
      res.json(nocs);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching NOCs' });
    }
  });

  app.post('/api/property-management/nocs/:id/submit', authMiddleware, async (req, res) => {
    try {
      const noc = await nocService.submitForReview(parseInt(req.params.id), req.userId!);
      res.json(noc);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting NOC' });
    }
  });

  app.post('/api/property-management/nocs/:id/approve', authMiddleware, async (req, res) => {
    try {
      const noc = await nocService.approveNOC(parseInt(req.params.id), req.userId!);
      res.json(noc);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving NOC' });
    }
  });

  app.post('/api/property-management/nocs/:id/issue', authMiddleware, async (req, res) => {
    try {
      const noc = await nocService.issueNOC(parseInt(req.params.id), req.userId!);
      res.json(noc);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error issuing NOC' });
    }
  });

  // Conveyance Deed routes
  app.post('/api/property-management/properties/:id/conveyance', authMiddleware, async (req, res) => {
    try {
      const deed = await conveyanceService.createConveyanceDeed({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(deed);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating conveyance deed' });
    }
  });

  app.get('/api/property-management/properties/:id/conveyance-deeds', authMiddleware, async (req, res) => {
    try {
      const deeds = await conveyanceService.getConveyanceDeeds({ propertyId: parseInt(req.params.id) });
      res.json(deeds);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching conveyance deeds' });
    }
  });

  app.post('/api/property-management/conveyance-deeds/:id/generate', authMiddleware, async (req, res) => {
    try {
      const deed = await conveyanceService.generateDeedPDF(parseInt(req.params.id), req.userId!);
      res.json(deed);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error generating deed' });
    }
  });

  // Phase 6: Construction Services & Certificates Routes

  // Demarcation Request routes
  app.post('/api/property-management/properties/:id/demarcation', authMiddleware, async (req, res) => {
    try {
      const request = await demarcationService.createDemarcationRequest({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating demarcation request' });
    }
  });

  app.get('/api/property-management/properties/:id/demarcation', authMiddleware, async (req, res) => {
    try {
      const requests = await demarcationService.getDemarcationRequests({
        propertyId: parseInt(req.params.id),
        status: req.query.status as string,
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching demarcation requests' });
    }
  });

  app.post('/api/property-management/demarcation/:id/schedule-inspection', authMiddleware, async (req, res) => {
    try {
      const request = await demarcationService.scheduleInspection(
        parseInt(req.params.id),
        new Date(req.body.scheduledAt),
        req.body.inspectedBy,
        req.userId!
      );
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling inspection' });
    }
  });

  app.post('/api/property-management/demarcation/:id/complete-inspection', authMiddleware, async (req, res) => {
    try {
      const request = await demarcationService.completeInspection(
        parseInt(req.params.id),
        req.body,
        req.userId!
      );
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing inspection' });
    }
  });

  app.post('/api/property-management/demarcation/:id/issue-certificate', authMiddleware, async (req, res) => {
    try {
      const request = await demarcationService.issueCertificate(parseInt(req.params.id), req.userId!);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error issuing certificate' });
    }
  });

  // DPC Request routes
  app.post('/api/property-management/properties/:id/dpc', authMiddleware, async (req, res) => {
    try {
      const request = await dpcService.createDpcRequest({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating DPC request' });
    }
  });

  app.get('/api/property-management/properties/:id/dpc', authMiddleware, async (req, res) => {
    try {
      const requests = await dpcService.getDpcRequests({
        propertyId: parseInt(req.params.id),
        status: req.query.status as string,
      });
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching DPC requests' });
    }
  });

  app.post('/api/property-management/dpc/:id/update-checklist', authMiddleware, async (req, res) => {
    try {
      const request = await dpcService.updateChecklist(
        parseInt(req.params.id),
        req.body.checklistJson,
        req.userId!
      );
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating checklist' });
    }
  });

  app.post('/api/property-management/dpc/:id/schedule-inspection', authMiddleware, async (req, res) => {
    try {
      const request = await dpcService.scheduleInspection(
        parseInt(req.params.id),
        new Date(req.body.scheduledAt),
        req.body.inspectedBy,
        req.userId!
      );
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling inspection' });
    }
  });

  app.post('/api/property-management/dpc/:id/complete-inspection', authMiddleware, async (req, res) => {
    try {
      const request = await dpcService.completeInspection(
        parseInt(req.params.id),
        req.body,
        req.userId!
      );
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing inspection' });
    }
  });

  app.post('/api/property-management/dpc/:id/issue-certificate', authMiddleware, async (req, res) => {
    try {
      const request = await dpcService.issueCertificate(parseInt(req.params.id), req.userId!);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error issuing certificate' });
    }
  });

  // Occupancy Certificate routes
  app.post('/api/property-management/properties/:id/occupancy-certificate', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.createOccupancyCertificateRequest({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating OC request' });
    }
  });

  app.get('/api/property-management/properties/:id/occupancy-certificates', authMiddleware, async (req, res) => {
    try {
      const certificates = await certificateService.getOccupancyCertificates({
        propertyId: parseInt(req.params.id),
        status: req.query.status as string,
      });
      res.json(certificates);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching occupancy certificates' });
    }
  });

  app.post('/api/property-management/occupancy-certificate/:id/update-checklist', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.updateOCChecklist(
        parseInt(req.params.id),
        req.body.checklistJson,
        req.userId!
      );
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating checklist' });
    }
  });

  app.post('/api/property-management/occupancy-certificate/:id/schedule-inspection', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.scheduleOCInspection(
        parseInt(req.params.id),
        new Date(req.body.scheduledAt),
        req.body.inspectedBy,
        req.userId!
      );
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling inspection' });
    }
  });

  app.post('/api/property-management/occupancy-certificate/:id/complete-inspection', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.completeOCInspection(
        parseInt(req.params.id),
        req.body,
        req.userId!
      );
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing inspection' });
    }
  });

  app.post('/api/property-management/occupancy-certificate/:id/issue', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.issueOccupancyCertificate(parseInt(req.params.id), req.userId!);
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error issuing certificate' });
    }
  });

  // Completion Certificate routes
  app.post('/api/property-management/properties/:id/completion-certificate', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.createCompletionCertificateRequest({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating CC request' });
    }
  });

  app.get('/api/property-management/properties/:id/completion-certificates', authMiddleware, async (req, res) => {
    try {
      const certificates = await certificateService.getCompletionCertificates({
        propertyId: parseInt(req.params.id),
        status: req.query.status as string,
      });
      res.json(certificates);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching completion certificates' });
    }
  });

  app.post('/api/property-management/completion-certificate/:id/update-checklist', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.updateCCChecklist(
        parseInt(req.params.id),
        req.body.checklistJson,
        req.userId!
      );
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating checklist' });
    }
  });

  app.post('/api/property-management/completion-certificate/:id/schedule-inspection', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.scheduleCCInspection(
        parseInt(req.params.id),
        new Date(req.body.scheduledAt),
        req.body.inspectedBy,
        req.userId!
      );
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling inspection' });
    }
  });

  app.post('/api/property-management/completion-certificate/:id/complete-inspection', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.completeCCInspection(
        parseInt(req.params.id),
        req.body,
        req.userId!
      );
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing inspection' });
    }
  });

  app.post('/api/property-management/completion-certificate/:id/issue', authMiddleware, async (req, res) => {
    try {
      const certificate = await certificateService.issueCompletionCertificate(parseInt(req.params.id), req.userId!);
      res.json(certificate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error issuing certificate' });
    }
  });

  // Deviation routes
  app.post('/api/property-management/properties/:id/deviations', authMiddleware, async (req, res) => {
    try {
      const deviation = await deviationService.recordDeviation({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(deviation);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error recording deviation' });
    }
  });

  app.get('/api/property-management/properties/:id/deviations', authMiddleware, async (req, res) => {
    try {
      const deviations = await deviationService.getDeviations({
        propertyId: parseInt(req.params.id),
        status: req.query.status as string,
        deviationType: req.query.deviationType as string,
      });
      res.json(deviations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching deviations' });
    }
  });

  app.post('/api/property-management/deviations/:id/levy-fee', authMiddleware, async (req, res) => {
    try {
      const deviation = await deviationService.levyFee(
        parseInt(req.params.id),
        req.body.fee,
        req.body.penalty,
        req.userId!
      );
      res.json(deviation);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error levying fee' });
    }
  });

  app.post('/api/property-management/deviations/:id/record-rectification', authMiddleware, async (req, res) => {
    try {
      const deviation = await deviationService.recordRectification(
        parseInt(req.params.id),
        req.body,
        req.userId!
      );
      res.json(deviation);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error recording rectification' });
    }
  });

  app.post('/api/property-management/deviations/:id/approve', authMiddleware, async (req, res) => {
    try {
      const deviation = await deviationService.approveRectification(parseInt(req.params.id), req.userId!);
      res.json(deviation);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving rectification' });
    }
  });

  // Phase 7: Water & Sewerage Connections routes
  // Water Connection routes
  app.post('/api/property-management/properties/:id/water-connection', authMiddleware, async (req, res) => {
    try {
      const connection = await waterConnectionService.applyForConnection({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error applying for water connection' });
    }
  });

  app.get('/api/property-management/properties/:id/water-connection', authMiddleware, async (req, res) => {
    try {
      const connections = await waterConnectionService.getConnections({
        propertyId: parseInt(req.params.id),
        status: req.query.status as string,
      });
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching water connections' });
    }
  });

  app.get('/api/property-management/water-connections/:id', authMiddleware, async (req, res) => {
    try {
      const connection = await waterConnectionService.getConnection(parseInt(req.params.id));
      res.json(connection);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Water connection not found' });
    }
  });

  app.post('/api/property-management/water-connections/:id/inspection', authMiddleware, async (req, res) => {
    try {
      const inspection = await waterConnectionService.scheduleInspection(
        parseInt(req.params.id),
        req.body,
        req.userId!
      );
      res.json(inspection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling inspection' });
    }
  });

  app.post('/api/property-management/water-connections/inspections/:id/complete', authMiddleware, async (req, res) => {
    try {
      const inspection = await waterConnectionService.completeInspection(
        parseInt(req.params.id),
        req.body.result,
        req.body.remarks,
        req.body.photos,
        req.userId!
      );
      res.json(inspection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing inspection' });
    }
  });

  app.post('/api/property-management/water-connections/:id/sanction', authMiddleware, async (req, res) => {
    try {
      const connection = await waterConnectionService.sanctionConnection(parseInt(req.params.id), req.userId!);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error sanctioning connection' });
    }
  });

  app.post('/api/property-management/water-connections/:id/activate', authMiddleware, async (req, res) => {
    try {
      const connection = await waterConnectionService.activateConnection(
        parseInt(req.params.id),
        req.body.meterNo,
        req.body.meterIntegrationData,
        req.userId!
      );
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error activating connection' });
    }
  });

  app.post('/api/property-management/water-connections/:id/renew', authMiddleware, async (req, res) => {
    try {
      const connection = await waterConnectionService.renewConnection(parseInt(req.params.id), req.userId!);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error renewing connection' });
    }
  });

  app.post('/api/property-management/water-connections/:id/close', authMiddleware, async (req, res) => {
    try {
      const connection = await waterConnectionService.closeConnection(
        parseInt(req.params.id),
        req.body.reason,
        req.userId!
      );
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error closing connection' });
    }
  });

  // Sewerage Connection routes
  app.post('/api/property-management/properties/:id/sewerage-connection', authMiddleware, async (req, res) => {
    try {
      const connection = await sewerageConnectionService.applyForConnection({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error applying for sewerage connection' });
    }
  });

  app.get('/api/property-management/properties/:id/sewerage-connection', authMiddleware, async (req, res) => {
    try {
      const connections = await sewerageConnectionService.getConnections({
        propertyId: parseInt(req.params.id),
        status: req.query.status as string,
      });
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching sewerage connections' });
    }
  });

  app.get('/api/property-management/sewerage-connections/:id', authMiddleware, async (req, res) => {
    try {
      const connection = await sewerageConnectionService.getConnection(parseInt(req.params.id));
      res.json(connection);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Sewerage connection not found' });
    }
  });

  app.post('/api/property-management/sewerage-connections/:id/inspection', authMiddleware, async (req, res) => {
    try {
      const inspection = await sewerageConnectionService.scheduleInspection(
        parseInt(req.params.id),
        req.body,
        req.userId!
      );
      res.json(inspection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling inspection' });
    }
  });

  app.post('/api/property-management/sewerage-connections/inspections/:id/complete', authMiddleware, async (req, res) => {
    try {
      const inspection = await sewerageConnectionService.completeInspection(
        parseInt(req.params.id),
        req.body.result,
        req.body.remarks,
        req.body.photos,
        req.userId!
      );
      res.json(inspection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing inspection' });
    }
  });

  app.post('/api/property-management/sewerage-connections/:id/sanction', authMiddleware, async (req, res) => {
    try {
      const connection = await sewerageConnectionService.sanctionConnection(parseInt(req.params.id), req.userId!);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error sanctioning connection' });
    }
  });

  app.post('/api/property-management/sewerage-connections/:id/activate', authMiddleware, async (req, res) => {
    try {
      const connection = await sewerageConnectionService.activateConnection(parseInt(req.params.id), req.userId!);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error activating connection' });
    }
  });

  app.post('/api/property-management/sewerage-connections/:id/renew', authMiddleware, async (req, res) => {
    try {
      const connection = await sewerageConnectionService.renewConnection(parseInt(req.params.id), req.userId!);
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error renewing connection' });
    }
  });

  app.post('/api/property-management/sewerage-connections/:id/close', authMiddleware, async (req, res) => {
    try {
      const connection = await sewerageConnectionService.closeConnection(
        parseInt(req.params.id),
        req.body.reason,
        req.userId!
      );
      res.json(connection);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error closing connection' });
    }
  });

  // ============================================================================
  // Phase 8: Property Registration Integration
  // ============================================================================

  // Registration Case routes
  app.post('/api/property-management/properties/:id/registration', authMiddleware, async (req, res) => {
    try {
      const registrationCase = await registrationService.createRegistrationCase({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(registrationCase);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating registration case' });
    }
  });

  app.get('/api/property-management/properties/:id/registration', authMiddleware, async (req, res) => {
    try {
      const cases = await registrationService.getRegistrationCases({ propertyId: parseInt(req.params.id) });
      res.json(cases);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error fetching registration cases' });
    }
  });

  app.get('/api/property-management/registration/:id', authMiddleware, async (req, res) => {
    try {
      const registrationCase = await registrationService.getRegistrationCaseWithDetails(parseInt(req.params.id));
      res.json(registrationCase);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error fetching registration case' });
    }
  });

  // Valuation routes
  app.post('/api/property-management/registration/:id/valuation', authMiddleware, async (req, res) => {
    try {
      const { circleRate, multipliers } = req.body;
      const result = await registrationService.calculateValuation(
        parseInt(req.params.id),
        circleRate,
        multipliers || {}
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error calculating valuation' });
    }
  });

  // KYC Verification routes
  app.post('/api/property-management/registration/:id/kyc', authMiddleware, async (req, res) => {
    try {
      const { partyId, verificationType, documentNumber } = req.body;
      const result = await registrationService.verifyKYC(
        parseInt(req.params.id),
        partyId,
        verificationType,
        documentNumber,
        req.userId!
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error verifying KYC' });
    }
  });

  // Encumbrance routes
  app.post('/api/property-management/registration/:id/encumbrance', authMiddleware, async (req, res) => {
    try {
      const encumbrance = await registrationService.generateEncumbranceCertificate(
        parseInt(req.params.id),
        req.userId!
      );
      res.json(encumbrance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error generating encumbrance certificate' });
    }
  });

  // SRO Slot routes
  app.get('/api/property-management/sro/slots', authMiddleware, async (req, res) => {
    try {
      const { sroOffice, startDate, endDate } = req.query;
      const slots = await sroService.getAvailableSlots(
        sroOffice as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(slots);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error fetching slots' });
    }
  });

  app.post('/api/property-management/registration/:id/slot', authMiddleware, async (req, res) => {
    try {
      const { slotId } = req.body;
      const slot = await registrationService.bookSlot(
        parseInt(req.params.id),
        slotId,
        req.userId!
      );
      res.json(slot);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error booking slot' });
    }
  });

  app.post('/api/property-management/registration/:id/reschedule-slot', authMiddleware, async (req, res) => {
    try {
      const { oldSlotId, newSlotId } = req.body;
      const result = await sroService.rescheduleSlot(
        oldSlotId,
        newSlotId,
        parseInt(req.params.id),
        req.userId!
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error rescheduling slot' });
    }
  });

  // Deed routes
  app.post('/api/property-management/registration/:id/prepare-deed', authMiddleware, async (req, res) => {
    try {
      const deed = await registrationService.prepareDeed(parseInt(req.params.id), req.userId!);
      res.json(deed);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error preparing deed' });
    }
  });

  // Registration completion route
  app.post('/api/property-management/registration/:id/register', authMiddleware, async (req, res) => {
    try {
      const { registeredDeedPdfPath } = req.body;
      const registrationCase = await registrationService.completeRegistration(
        parseInt(req.params.id),
        registeredDeedPdfPath,
        req.userId!
      );
      res.json(registrationCase);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error completing registration' });
    }
  });

  // Get all registration cases
  app.get('/api/property-management/registration', authMiddleware, async (req, res) => {
    try {
      const { status, deedType } = req.query;
      const cases = await registrationService.getRegistrationCases({
        status: status as string,
        deedType: deedType as string,
      });
      res.json(cases);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error fetching registration cases' });
    }
  });

  // ============================================================================
  // Phase 10: Analytics, Dashboards & Reporting
  // ============================================================================

  // Analytics routes
  app.get('/api/property-management/analytics/dashboard-summary', authMiddleware, async (req, res) => {
    try {
      const summary = await pmsAnalyticsService.getDashboardSummary(req.userId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching dashboard summary' });
    }
  });

  app.get('/api/property-management/analytics/schemes', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, schemeId } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (schemeId) filters.schemeId = parseInt(schemeId as string);
      
      const analytics = await pmsAnalyticsService.getSchemeFunnelAnalytics(filters);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching scheme analytics' });
    }
  });

  app.get('/api/property-management/analytics/draw-statistics', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, schemeId } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (schemeId) filters.schemeId = parseInt(schemeId as string);
      
      const statistics = await pmsAnalyticsService.getDrawStatistics(filters);
      res.json(statistics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching draw statistics' });
    }
  });

  app.get('/api/property-management/analytics/receivables', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const analytics = await pmsAnalyticsService.getReceivablesAnalytics(filters);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching receivables analytics' });
    }
  });

  app.get('/api/property-management/analytics/sla', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const analytics = await pmsAnalyticsService.getSLAAnalytics(filters);
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching SLA analytics' });
    }
  });

  app.get('/api/property-management/analytics/registration-volumes', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const volumes = await pmsAnalyticsService.getRegistrationVolumes(filters);
      res.json(volumes);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error fetching registration volumes' });
    }
  });

  // Reports routes
  app.get('/api/property-management/reports/operational', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, schemeId, status } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (schemeId) filters.schemeId = parseInt(schemeId as string);
      if (status) filters.status = status as string;
      
      const report = await pmsReportsService.generateOperationalReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating operational report' });
    }
  });

  app.get('/api/property-management/reports/financial', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status as string;
      
      const report = await pmsReportsService.generateFinancialReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating financial report' });
    }
  });

  app.get('/api/property-management/reports/spatial', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      
      const report = await pmsReportsService.generateSpatialReport(filters);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating spatial report' });
    }
  });

  app.get('/api/property-management/reports/operational/export', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, schemeId, status } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (schemeId) filters.schemeId = parseInt(schemeId as string);
      if (status) filters.status = status as string;
      
      const report = await pmsReportsService.generateOperationalReport(filters);
      const csv = await pmsReportsService.exportReportToCSV(report, 'operational');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="operational-report.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error exporting operational report' });
    }
  });

  app.get('/api/property-management/reports/financial/export', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;
      const filters: any = {};
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status as string;
      
      const report = await pmsReportsService.generateFinancialReport(filters);
      const csv = await pmsReportsService.exportReportToCSV(report, 'financial');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="financial-report.csv"');
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error exporting financial report' });
    }
  });

  // Public verification endpoints
  app.get('/api/public/property-management/nocs/verify/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      const nocs = await storage.getNOCs({});
      const noc = nocs.find(n => n.hashSha256 === hash);
      
      if (!noc) {
        return res.status(404).json({ verified: false, message: 'NOC not found' });
      }

      let pdfVerified = false;
      if (noc.pdfPath) {
        const fs = await import('fs');
        const path = await import('path');
        const crypto = await import('crypto');
        const filePath = path.join(process.cwd(), noc.pdfPath);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          pdfVerified = actualHash === hash;
        }
      }

      res.json({
        verified: true,
        pdfVerified,
        noc: {
          type: noc.type,
          issuedAt: noc.issuedAt,
          status: noc.status,
        },
      });
    } catch (error) {
      res.status(500).json({ verified: false, message: 'Verification failed' });
    }
  });

  app.get('/api/public/property-management/conveyance-deeds/verify/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      const deeds = await storage.getConveyanceDeeds({});
      const deed = deeds.find(d => d.hashSha256 === hash);
      
      if (!deed) {
        return res.status(404).json({ verified: false, message: 'Conveyance deed not found' });
      }

      let pdfVerified = false;
      if (deed.pdfPath) {
        const fs = await import('fs');
        const path = await import('path');
        const crypto = await import('crypto');
        const filePath = path.join(process.cwd(), deed.pdfPath);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          pdfVerified = actualHash === hash;
        }
      }

      res.json({
        verified: true,
        pdfVerified,
        deed: {
          deedNo: deed.deedNo,
          deedDate: deed.deedDate,
          status: deed.status,
        },
      });
    } catch (error) {
      res.status(500).json({ verified: false, message: 'Verification failed' });
    }
  });

  // ============================================================================
  // PMS Phase 4 API Routes (Payments & Ledgers)
  // ============================================================================

  // Demand Note routes
  app.post('/api/property-management/properties/:id/demand-notes', authMiddleware, async (req, res) => {
    try {
      const demandNote = await demandNoteService.createDemandNote({
        ...req.body,
        propertyId: parseInt(req.params.id),
      }, req.userId!);
      res.json(demandNote);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating demand note' });
    }
  });

  app.get('/api/property-management/properties/:id/demand-notes', authMiddleware, async (req, res) => {
    try {
      const { partyId, status } = req.query;
      const filters: any = { propertyId: parseInt(req.params.id) };
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (status) filters.status = status as string;
      const demandNotes = await demandNoteService.getDemandNotes(filters);
      res.json(demandNotes);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching demand notes' });
    }
  });

  app.post('/api/property-management/demand-notes/:id/issue', authMiddleware, async (req, res) => {
    try {
      const demandNote = await demandNoteService.issueDemandNote(parseInt(req.params.id), req.userId!);
      res.json(demandNote);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error issuing demand note' });
    }
  });

  app.post('/api/property-management/demand-notes/:id/mark-overdue', authMiddleware, async (req, res) => {
    try {
      const demandNote = await demandNoteService.markOverdue(parseInt(req.params.id));
      res.json(demandNote);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error marking demand note as overdue' });
    }
  });

  // Payment routes
  app.post('/api/property-management/payments', authMiddleware, async (req, res) => {
    try {
      const payment = await paymentService.processPayment(req.body);
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error processing payment' });
    }
  });

  app.get('/api/property-management/payments', authMiddleware, async (req, res) => {
    try {
      const { propertyId, partyId, demandNoteId, status } = req.query;
      const filters: any = {};
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (demandNoteId) filters.demandNoteId = parseInt(demandNoteId as string);
      if (status) filters.status = status as string;
      const payments = await paymentService.getPayments(filters);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching payments' });
    }
  });

  app.post('/api/property-management/payments/:id/confirm', authMiddleware, async (req, res) => {
    try {
      const payment = await paymentService.confirmPayment(parseInt(req.params.id), req.body);
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error confirming payment' });
    }
  });

  app.post('/api/property-management/payments/:id/refund', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const payment = await paymentService.refundPayment(parseInt(req.params.id), reason || 'Refund requested');
      res.json(payment);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error refunding payment' });
    }
  });

  // Receipt routes
  app.post('/api/property-management/payments/:id/receipt', authMiddleware, async (req, res) => {
    try {
      const receipt = await receiptService.generateReceipt(parseInt(req.params.id), req.userId!);
      res.json(receipt);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error generating receipt' });
    }
  });

  app.get('/api/property-management/receipts', authMiddleware, async (req, res) => {
    try {
      const { paymentId } = req.query;
      const filters: any = {};
      if (paymentId) filters.paymentId = parseInt(paymentId as string);
      const receipts = await receiptService.getReceipts(filters);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching receipts' });
    }
  });

  // Refund routes
  app.post('/api/property-management/refunds', authMiddleware, async (req, res) => {
    try {
      const refund = await refundService.createRefund(req.body, req.userId!);
      res.json(refund);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating refund' });
    }
  });

  app.get('/api/property-management/refunds', authMiddleware, async (req, res) => {
    try {
      const { propertyId, partyId, paymentId, status } = req.query;
      const filters: any = {};
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (paymentId) filters.paymentId = parseInt(paymentId as string);
      if (status) filters.status = status as string;
      const refunds = await refundService.getRefunds(filters);
      res.json(refunds);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching refunds' });
    }
  });

  app.post('/api/property-management/refunds/:id/approve', authMiddleware, async (req, res) => {
    try {
      const refund = await refundService.approveRefund(parseInt(req.params.id), req.userId!);
      res.json(refund);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error approving refund' });
    }
  });

  app.post('/api/property-management/refunds/:id/process', authMiddleware, async (req, res) => {
    try {
      const refund = await refundService.processRefund(parseInt(req.params.id));
      res.json(refund);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error processing refund' });
    }
  });

  app.post('/api/property-management/refunds/:id/reject', authMiddleware, async (req, res) => {
    try {
      const { reason } = req.body;
      const refund = await refundService.rejectRefund(parseInt(req.params.id), reason || 'Rejected', req.userId!);
      res.json(refund);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error rejecting refund' });
    }
  });

  // Ledger routes
  app.get('/api/property-management/properties/:id/ledger', authMiddleware, async (req, res) => {
    try {
      const { partyId } = req.query;
      if (!partyId) {
        return res.status(400).json({ message: 'partyId is required' });
      }
      const ledger = await ledgerService.getPropertyLedger(parseInt(req.params.id), parseInt(partyId as string));
      res.json(ledger);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching ledger' });
    }
  });

  app.get('/api/property-management/properties/:id/balance', authMiddleware, async (req, res) => {
    try {
      const { partyId } = req.query;
      if (!partyId) {
        return res.status(400).json({ message: 'partyId is required' });
      }
      const balance = await ledgerService.getCurrentBalance(parseInt(req.params.id), parseInt(partyId as string));
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching balance' });
    }
  });

  app.get('/api/property-management/properties/:id/ledger-summary', authMiddleware, async (req, res) => {
    try {
      const { partyId } = req.query;
      if (!partyId) {
        return res.status(400).json({ message: 'partyId is required' });
      }
      const summary = await ledgerService.getLedgerSummary(parseInt(req.params.id), parseInt(partyId as string));
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching ledger summary' });
    }
  });

  app.get('/api/property-management/properties/:id/ledger/export', authMiddleware, async (req, res) => {
    try {
      const { partyId } = req.query;
      if (!partyId) {
        return res.status(400).json({ message: 'partyId is required' });
      }
      const csv = await ledgerService.exportLedgerToCSV(parseInt(req.params.id), parseInt(partyId as string));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="ledger-${req.params.id}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: 'Error exporting ledger' });
    }
  });

  app.post('/api/property-management/properties/:id/reconcile', authMiddleware, async (req, res) => {
    try {
      const { partyId, accountsData } = req.body;
      if (!partyId) {
        return res.status(400).json({ message: 'partyId is required' });
      }
      const result = await ledgerService.reconcileLedger(parseInt(req.params.id), partyId, accountsData || []);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error reconciling ledger' });
    }
  });

  // Public verification endpoints
  app.get('/api/public/property-management/demand-notes/verify/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      const demandNotes = await storage.getDemandNotes({});
      const demandNote = demandNotes.find(d => d.hashSha256 === hash);
      
      if (!demandNote) {
        return res.status(404).json({ verified: false, message: 'Demand note not found' });
      }

      let pdfVerified = false;
      if (demandNote.pdfPath) {
        const fs = await import('fs');
        const path = await import('path');
        const crypto = await import('crypto');
        const filePath = path.join(process.cwd(), demandNote.pdfPath);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          pdfVerified = actualHash === hash;
        }
      }

      res.json({
        verified: true,
        pdfVerified,
        demandNote: {
          noteNo: demandNote.noteNo,
          amount: demandNote.amount,
          dueDate: demandNote.dueDate,
          status: demandNote.status,
        },
      });
    } catch (error) {
      res.status(500).json({ verified: false, message: 'Verification failed' });
    }
  });

  app.get('/api/public/property-management/receipts/verify/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      const receipts = await storage.getReceipts({});
      const receipt = receipts.find(r => r.hashSha256 === hash);
      
      if (!receipt) {
        return res.status(404).json({ verified: false, message: 'Receipt not found' });
      }

      let pdfVerified = false;
      if (receipt.pdfPath) {
        const fs = await import('fs');
        const path = await import('path');
        const crypto = await import('crypto');
        const filePath = path.join(process.cwd(), receipt.pdfPath);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
          pdfVerified = actualHash === hash;
        }
      }

      res.json({
        verified: true,
        pdfVerified,
        receipt: {
          receiptNo: receipt.receiptNo,
          issuedAt: receipt.issuedAt,
        },
      });
    } catch (error) {
      res.status(500).json({ verified: false, message: 'Verification failed' });
    }
  });

  // ============================================================================
  // PMS Phase 5 API Routes (Citizen Services Portal)
  // ============================================================================

  // Public property search and OTP
  app.post('/api/public/property-management/properties/search/otp', async (req, res) => {
    try {
      const { propertyRef, phone } = req.body;
      if (!propertyRef || !phone) {
        return res.status(400).json({ message: 'propertyRef and phone are required' });
      }
      const result = await citizenService.generateOTP(propertyRef, phone);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error generating OTP' });
    }
  });

  app.post('/api/public/property-management/properties/search/verify', async (req, res) => {
    try {
      const { propertyRef, phone, otp } = req.body;
      if (!propertyRef || !phone || !otp) {
        return res.status(400).json({ message: 'propertyRef, phone, and otp are required' });
      }
      const result = await citizenService.verifyOTP(propertyRef, phone, otp);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: 'Error verifying OTP' });
    }
  });

  // Property 360 view
  app.get('/api/public/property-management/properties/:id/360', async (req, res) => {
    try {
      const { accessToken } = req.query;
      const property360 = await citizenService.getProperty360(
        parseInt(req.params.id),
        accessToken as string | undefined
      );
      res.json(property360);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Property not found' });
    }
  });

  // Passbook download
  app.get('/api/public/property-management/properties/:id/passbook', async (req, res) => {
    try {
      const { partyId, accessToken } = req.query;
      if (!partyId) {
        return res.status(400).json({ message: 'partyId is required' });
      }

      // Verify access token if provided
      if (accessToken) {
        // Access token verification would be done here
        // For now, proceed with generation
      }

      const { filePath, hash } = await passbookService.generatePassbook(
        parseInt(req.params.id),
        parseInt(partyId as string)
      );

      const relativePath = path.relative(process.cwd(), filePath);
      res.json({
        filePath: relativePath,
        downloadUrl: `/${relativePath.replace(/\\/g, '/')}`,
        hash,
      });
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Error generating passbook' });
    }
  });

  // Service requests
  app.post('/api/public/property-management/service-requests', async (req, res) => {
    try {
      const serviceRequest = await serviceRequestService.createServiceRequest(req.body);
      res.json(serviceRequest);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating service request' });
    }
  });

  app.get('/api/public/property-management/service-requests/:refNo', async (req, res) => {
    try {
      const serviceRequest = await serviceRequestService.getServiceRequest(req.params.refNo);
      res.json(serviceRequest);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Service request not found' });
    }
  });

  app.get('/api/public/property-management/service-requests', async (req, res) => {
    try {
      const { propertyId, partyId, status, requestType } = req.query;
      const filters: any = {};
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (status) filters.status = status as string;
      if (requestType) filters.requestType = requestType as string;
      const requests = await serviceRequestService.getServiceRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching service requests' });
    }
  });

  // Officer endpoints for service request management
  app.get('/api/property-management/service-requests', authMiddleware, async (req, res) => {
    try {
      const { propertyId, partyId, status, requestType } = req.query;
      const filters: any = {};
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (status) filters.status = status as string;
      if (requestType) filters.requestType = requestType as string;
      const requests = await serviceRequestService.getServiceRequests(filters);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching service requests' });
    }
  });

  app.post('/api/property-management/service-requests/:id/assign', authMiddleware, async (req, res) => {
    try {
      const serviceRequest = await serviceRequestService.assignServiceRequest(
        parseInt(req.params.id),
        req.userId!
      );
      res.json(serviceRequest);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error assigning service request' });
    }
  });

  app.post('/api/property-management/service-requests/:id/update-status', authMiddleware, async (req, res) => {
    try {
      const { status, resolution } = req.body;
      const serviceRequest = await serviceRequestService.updateServiceRequestStatus(
        parseInt(req.params.id),
        status,
        resolution,
        req.userId
      );
      res.json(serviceRequest);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating service request' });
    }
  });

  // Document download (for documents linked to properties)
  app.get('/api/public/property-management/documents/:id/download', async (req, res) => {
    try {
      const { accessToken } = req.query;
      // In production, verify access token and check permissions
      
      // Get document path from storage
      // This would integrate with existing document management
      // For now, return a placeholder
      res.json({ message: 'Document download endpoint - to be integrated with document management system' });
    } catch (error) {
      res.status(404).json({ message: 'Document not found' });
    }
  });

  // Phase 9: Grievance routes
  app.post('/api/property-management/grievances', authMiddleware, async (req, res) => {
    try {
      const grievance = await grievanceService.createGrievance(req.body, req.userId);
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating grievance' });
    }
  });

  app.get('/api/property-management/grievances', authMiddleware, async (req, res) => {
    try {
      const { partyId, propertyId, status, category, assignedTo } = req.query;
      const filters: any = {};
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (status) filters.status = status as string;
      if (category) filters.category = category as string;
      if (assignedTo) filters.assignedTo = parseInt(assignedTo as string);
      const grievances = await grievanceService.getGrievances(filters);
      res.json(grievances);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching grievances' });
    }
  });

  app.get('/api/property-management/grievances/:id', authMiddleware, async (req, res) => {
    try {
      const grievance = await grievanceService.getGrievance(parseInt(req.params.id));
      res.json(grievance);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Grievance not found' });
    }
  });

  app.get('/api/property-management/grievances/ref/:refNo', authMiddleware, async (req, res) => {
    try {
      const grievance = await grievanceService.getGrievanceByRefNo(req.params.refNo);
      res.json(grievance);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Grievance not found' });
    }
  });

  app.post('/api/property-management/grievances/:id/assign', authMiddleware, async (req, res) => {
    try {
      const { assignedTo } = req.body;
      if (!assignedTo) {
        return res.status(400).json({ message: 'assignedTo is required' });
      }
      const grievance = await grievanceService.assignGrievance(
        parseInt(req.params.id),
        assignedTo,
        req.userId!
      );
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error assigning grievance' });
    }
  });

  app.post('/api/property-management/grievances/:id/start', authMiddleware, async (req, res) => {
    try {
      const grievance = await grievanceService.startGrievance(parseInt(req.params.id), req.userId!);
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error starting grievance' });
    }
  });

  app.post('/api/property-management/grievances/:id/resolve', authMiddleware, async (req, res) => {
    try {
      const { resolutionText, resolutionPdf } = req.body;
      if (!resolutionText) {
        return res.status(400).json({ message: 'resolutionText is required' });
      }
      const grievance = await grievanceService.resolveGrievance(
        parseInt(req.params.id),
        resolutionText,
        req.userId!,
        resolutionPdf
      );
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error resolving grievance' });
    }
  });

  app.post('/api/property-management/grievances/:id/escalate', authMiddleware, async (req, res) => {
    try {
      const { escalatedTo } = req.body;
      if (!escalatedTo) {
        return res.status(400).json({ message: 'escalatedTo is required' });
      }
      const grievance = await grievanceService.escalateGrievance(
        parseInt(req.params.id),
        escalatedTo,
        req.userId!
      );
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error escalating grievance' });
    }
  });

  app.post('/api/property-management/grievances/:id/reopen', authMiddleware, async (req, res) => {
    try {
      const grievance = await grievanceService.reopenGrievance(parseInt(req.params.id), req.userId!);
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error reopening grievance' });
    }
  });

  app.post('/api/property-management/grievances/:id/close', authMiddleware, async (req, res) => {
    try {
      const grievance = await grievanceService.closeGrievance(parseInt(req.params.id), req.userId!);
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error closing grievance' });
    }
  });

  app.post('/api/property-management/grievances/:id/feedback', async (req, res) => {
    try {
      const { rating, feedback } = req.body;
      if (!rating) {
        return res.status(400).json({ message: 'rating is required' });
      }
      const grievance = await grievanceService.submitFeedback(
        parseInt(req.params.id),
        rating,
        feedback
      );
      res.json(grievance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error submitting feedback' });
    }
  });

  app.get('/api/property-management/grievances/sla/violations', authMiddleware, async (req, res) => {
    try {
      const violations = await grievanceService.getSLAViolations();
      res.json(violations);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching SLA violations' });
    }
  });

  // Phase 9: Legal Case routes
  app.post('/api/property-management/legal-cases', authMiddleware, async (req, res) => {
    try {
      const legalCase = await legalCaseService.createLegalCase(req.body, req.userId);
      res.json(legalCase);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating legal case' });
    }
  });

  app.get('/api/property-management/legal-cases', authMiddleware, async (req, res) => {
    try {
      const { propertyId, partyId, grievanceId, status, assignedTo } = req.query;
      const filters: any = {};
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (partyId) filters.partyId = parseInt(partyId as string);
      if (grievanceId) filters.grievanceId = parseInt(grievanceId as string);
      if (status) filters.status = status as string;
      if (assignedTo) filters.assignedTo = parseInt(assignedTo as string);
      const legalCases = await legalCaseService.getLegalCases(filters);
      res.json(legalCases);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching legal cases' });
    }
  });

  app.get('/api/property-management/legal-cases/:id', authMiddleware, async (req, res) => {
    try {
      const legalCase = await legalCaseService.getLegalCase(parseInt(req.params.id));
      res.json(legalCase);
    } catch (error) {
      res.status(404).json({ message: error instanceof Error ? error.message : 'Legal case not found' });
    }
  });

  app.put('/api/property-management/legal-cases/:id', authMiddleware, async (req, res) => {
    try {
      const legalCase = await legalCaseService.updateLegalCase(parseInt(req.params.id), req.body);
      res.json(legalCase);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating legal case' });
    }
  });

  app.post('/api/property-management/legal-cases/:id/hearings', authMiddleware, async (req, res) => {
    try {
      const hearing = await legalCaseService.scheduleHearing(parseInt(req.params.id), req.body);
      res.json(hearing);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error scheduling hearing' });
    }
  });

  app.get('/api/property-management/legal-cases/:id/hearings', authMiddleware, async (req, res) => {
    try {
      const hearings = await legalCaseService.getHearings(parseInt(req.params.id));
      res.json(hearings);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching hearings' });
    }
  });

  app.put('/api/property-management/legal-cases/hearings/:id', authMiddleware, async (req, res) => {
    try {
      const hearing = await legalCaseService.updateHearing(parseInt(req.params.id), req.body);
      res.json(hearing);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating hearing' });
    }
  });

  app.post('/api/property-management/legal-cases/:id/orders', authMiddleware, async (req, res) => {
    try {
      const order = await legalCaseService.recordOrder(parseInt(req.params.id), req.body);
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error recording order' });
    }
  });

  app.get('/api/property-management/legal-cases/:id/orders', authMiddleware, async (req, res) => {
    try {
      const orders = await legalCaseService.getOrders(parseInt(req.params.id));
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching orders' });
    }
  });

  app.put('/api/property-management/legal-cases/orders/:id/compliance', authMiddleware, async (req, res) => {
    try {
      const { complianceStatus, complianceNotes } = req.body;
      if (!complianceStatus) {
        return res.status(400).json({ message: 'complianceStatus is required' });
      }
      const order = await legalCaseService.updateOrderCompliance(
        parseInt(req.params.id),
        complianceStatus,
        complianceNotes,
        req.userId
      );
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating compliance' });
    }
  });

  app.get('/api/property-management/legal-cases/upcoming-hearings', authMiddleware, async (req, res) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 7;
      const cases = await legalCaseService.getUpcomingHearings(days);
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching upcoming hearings' });
    }
  });

  app.get('/api/property-management/legal-cases/orders/requiring-compliance', authMiddleware, async (req, res) => {
    try {
      const orders = await legalCaseService.getOrdersRequiringCompliance();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching orders requiring compliance' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
