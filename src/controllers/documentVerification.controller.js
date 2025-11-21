import { Request, Response } from 'express';

// Interfaces
interface Document {
  filename: string;
  originalname: string;
  path: string;
  size: number;
  mimetype: string;
}

interface VerificationRequest {
  id: string;
  documents: Document[];
  additionalNotes: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewer: string | null;
  reviewNotes: string | null;
}

// Simulación de base de datos (en producción usarías una base de datos real)
let verificationRequests: VerificationRequest[] = [];

export const uploadDocuments = async (req: Request, res: Response) => {
  try {
    const { documents, additionalNotes } = req.body;

    if (!documents || documents.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No se han subido archivos' 
      });
    }

    // Crear registro de verificación
    const verificationRequest: VerificationRequest = {
      id: 'ES-' + Date.now(),
      documents: documents.map((doc: any) => ({
        filename: doc.name,
        originalname: doc.name,
        path: `/uploads/${doc.name}`,
        size: doc.size,
        mimetype: doc.type
      })),
      additionalNotes: additionalNotes || '',
      status: 'pending',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewer: null,
      reviewNotes: null
    };

    verificationRequests.push(verificationRequest);

    // Simular procesamiento asíncrono
    await new Promise(resolve => setTimeout(resolve, 1000));

    res.status(200).json({
      success: true,
      message: 'Documentos subidos exitosamente',
      requestId: verificationRequest.id,
      filesCount: documents.length
    });

  } catch (error) {
    console.error('Error al subir documentos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const getVerificationStatus = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const request = verificationRequests.find(req => req.id === requestId);

    if (!request) {
      return res.status(404).json({ 
        success: false,
        error: 'Solicitud no encontrada' 
      });
    }

    res.json({
      success: true,
      request
    });

  } catch (error) {
    console.error('Error al obtener estado:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const getPendingRequests = async (req: Request, res: Response) => {
  try {
    const pendingRequests = verificationRequests.filter(req => req.status === 'pending');
    
    res.json({
      success: true,
      requests: pendingRequests,
      count: pendingRequests.length
    });

  } catch (error) {
    console.error('Error al obtener solicitudes pendientes:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};

export const reviewRequest = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const { status, reviewNotes, reviewer } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Estado no válido' 
      });
    }

    const requestIndex = verificationRequests.findIndex(req => req.id === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Solicitud no encontrada' 
      });
    }

    verificationRequests[requestIndex] = {
      ...verificationRequests[requestIndex],
      status,
      reviewNotes,
      reviewer: reviewer || 'admin',
      reviewedAt: new Date()
    };

    res.json({
      success: true,
      message: `Solicitud ${status === 'approved' ? 'aprobada' : 'rechazada'} exitosamente`,
      request: verificationRequests[requestIndex]
    });

  } catch (error) {
    console.error('Error al verificar solicitud:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor' 
    });
  }
};