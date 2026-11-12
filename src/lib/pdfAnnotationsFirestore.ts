import { 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';
import { db } from './firebase';
import { PdfAnnotation } from '../types/educationalResources';

export interface FirestoreAnnotationMeta {
  resourceTitle?: string;
  teacherName?: string;
  subject?: string;
}

/**
 * Real-time subscription to PDF Annotations for a given resource in Firestore.
 * Listens to both `educational_resources` doc and `pdf_annotations` doc.
 */
export function subscribeToPdfAnnotations(
  resourceId: string,
  onAnnotationsChange: (annotations: PdfAnnotation[], source: 'educational_resources' | 'pdf_annotations') => void,
  onError?: (error: unknown) => void
): () => void {
  if (!resourceId) return () => {};

  let unsubResource: Unsubscribe | null = null;
  let unsubDedicated: Unsubscribe | null = null;
  let hasReceivedDedicated = false;

  try {
    // 1. Dedicated pdf_annotations collection
    const dedicatedDocRef = doc(db, 'pdf_annotations', resourceId);
    unsubDedicated = onSnapshot(
      dedicatedDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.annotations)) {
            hasReceivedDedicated = true;
            onAnnotationsChange(data.annotations as PdfAnnotation[], 'pdf_annotations');
          }
        }
      },
      (err) => {
        console.warn('Firestore dedicated pdf_annotations snapshot note:', err);
        onError?.(err);
      }
    );

    // 2. Main educational_resources document
    const resourceDocRef = doc(db, 'educational_resources', resourceId);
    unsubResource = onSnapshot(
      resourceDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.pdf_annotations) && !hasReceivedDedicated) {
            onAnnotationsChange(data.pdf_annotations as PdfAnnotation[], 'educational_resources');
          }
        }
      },
      (err) => {
        console.warn('Firestore educational_resources snapshot note:', err);
        onError?.(err);
      }
    );
  } catch (err) {
    console.error('Error establishing Firestore annotations subscription:', err);
    onError?.(err);
  }

  return () => {
    if (unsubDedicated) unsubDedicated();
    if (unsubResource) unsubResource();
  };
}

/**
 * Fetch latest PDF Annotations for a resource from Firestore once
 */
export async function fetchPdfAnnotationsFromFirestore(
  resourceId: string
): Promise<PdfAnnotation[] | null> {
  if (!resourceId) return null;

  try {
    // Check dedicated collection first
    const dedicatedSnap = await getDoc(doc(db, 'pdf_annotations', resourceId));
    if (dedicatedSnap.exists() && Array.isArray(dedicatedSnap.data()?.annotations)) {
      return dedicatedSnap.data()?.annotations as PdfAnnotation[];
    }

    // Check educational_resources document
    const resSnap = await getDoc(doc(db, 'educational_resources', resourceId));
    if (resSnap.exists() && Array.isArray(resSnap.data()?.pdf_annotations)) {
      return resSnap.data()?.pdf_annotations as PdfAnnotation[];
    }
  } catch (err) {
    console.warn('Could not fetch PDF annotations from Firestore:', err);
  }

  return null;
}

/**
 * Persist PDF Annotations to Firestore across both documents for guaranteed persistence and retrieval
 */
export async function savePdfAnnotationsToFirestore(
  resourceId: string,
  annotations: PdfAnnotation[],
  meta?: FirestoreAnnotationMeta
): Promise<{ success: boolean; error?: unknown }> {
  if (!resourceId) {
    return { success: false, error: new Error('Invalid resourceId') };
  }

  const nowIso = new Date().toISOString();

  try {
    // 1. Save to dedicated pdf_annotations collection
    const dedicatedRef = doc(db, 'pdf_annotations', resourceId);
    await setDoc(
      dedicatedRef,
      {
        resourceId,
        resourceTitle: meta?.resourceTitle || '',
        annotations: annotations || [],
        updatedAt: nowIso,
        updatedBy: meta?.teacherName || 'أكاديمية التفوق أون لاين'
      },
      { merge: true }
    );

    // 2. Also merge update into educational_resources collection
    const resourceRef = doc(db, 'educational_resources', resourceId);
    await setDoc(
      resourceRef,
      {
        id: resourceId,
        pdf_annotations: annotations || [],
        updated_at: nowIso,
        ...(meta?.resourceTitle ? { title: meta.resourceTitle } : {}),
        ...(meta?.subject ? { subject: meta.subject } : {})
      },
      { merge: true }
    );

    return { success: true };
  } catch (err) {
    console.error('Failed to save PDF annotations to Firestore:', err);
    return { success: false, error: err };
  }
}

/**
 * Persist PDF Page Rotations to Firestore across dedicated and resource docs
 */
export async function savePageRotationsToFirestore(
  resourceId: string,
  pageRotations: Record<number, number>
): Promise<{ success: boolean; error?: unknown }> {
  if (!resourceId) {
    return { success: false, error: new Error('Invalid resourceId') };
  }

  const nowIso = new Date().toISOString();

  try {
    // 1. Save to dedicated pdf_annotations collection
    const dedicatedRef = doc(db, 'pdf_annotations', resourceId);
    await setDoc(
      dedicatedRef,
      {
        resourceId,
        page_rotations: pageRotations || {},
        updatedAt: nowIso
      },
      { merge: true }
    );

    // 2. Also merge update into educational_resources collection
    const resourceRef = doc(db, 'educational_resources', resourceId);
    await setDoc(
      resourceRef,
      {
        id: resourceId,
        page_rotations: pageRotations || {},
        updated_at: nowIso
      },
      { merge: true }
    );

    return { success: true };
  } catch (err) {
    console.warn('Failed to save page rotations to Firestore:', err);
    return { success: false, error: err };
  }
}

