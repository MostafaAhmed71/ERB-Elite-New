import { supabase } from './supabase';

export type DocumentSignatureResult = {
  id: string;
  verify_code: string;
  payload_hash: string;
  signature: string;
  issuer: string;
};

export type VerifiedDocument = {
  verify_code: string;
  doc_type: string;
  payload_hash: string;
  signature: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  valid: boolean;
};

/** P8 — توقيع وثيقة رسمية */
export async function signOfficialDocument(
  docType: string,
  payload: Record<string, unknown>,
): Promise<DocumentSignatureResult> {
  const { data, error } = await supabase.rpc('sign_official_document', {
    p_doc_type: docType,
    p_payload: payload,
  });
  if (error) throw error;
  return data as DocumentSignatureResult;
}

export async function verifyDocumentCode(code: string): Promise<VerifiedDocument | null> {
  const { data, error } = await supabase
    .from('document_signatures')
    .select('verify_code, doc_type, payload_hash, signature, metadata, created_at')
    .eq('verify_code', code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    metadata: data.metadata as Record<string, unknown> | null,
    valid: true,
  };
}

export function buildVerifyUrl(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  return `${base}/verify/${encodeURIComponent(code)}`;
}
