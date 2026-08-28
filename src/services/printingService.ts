import { supabase } from '../lib/supabase';


// ======================================================
// TYPES
// ======================================================

export type PrintingUploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
};


export type UploadedPrintingFile = {
  path: string;
  fileName: string;
  mimeType: string;
};


export type CreatePrintingRequestInput = {
  file: PrintingUploadFile;

  printType:
    | 'Black & White'
    | 'Colour';

  paperSize:
    | 'A4'
    | 'A3';

  printSide:
    | 'Single Side'
    | 'Double Side';

  pageCount: number;

  copies: number;

  binding:
    | 'None'
    | 'Spiral Binding';

  lamination:
    | 'None'
    | 'Lamination';

  printCost: number;

  bindingCost: number;

  laminationCost: number;

  estimatedTotal: number;

  customerNotes?: string | null;
};


export type CreatedPrintingRequest = {
  id: string;

  requestNumber: string;

  status: string;

  estimatedTotal: number;

  storagePath: string;
};


// ======================================================
// CURRENT USER
// ======================================================

async function getCurrentUser() {
  const {
    data: {
      user,
    },

    error,
  } =
    await supabase.auth.getUser();


  if (error) {
    throw error;
  }


  if (!user) {
    throw new Error(
      'Please login before submitting a printing request.'
    );
  }


  return user;
}


// ======================================================
// REQUEST NUMBER
// ======================================================

function generatePrintingRequestNumber() {
  const now =
    new Date();


  const year =
    now
      .getFullYear()
      .toString()
      .slice(-2);


  const month =
    String(
      now.getMonth() +
        1
    ).padStart(
      2,
      '0'
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );


  const unique =
    `${Date.now()
      .toString()
      .slice(-6)}${Math.floor(
      Math.random() *
        90 +
        10
    )}`;


  return `LHP${year}${month}${day}${unique}`;
}


// ======================================================
// CLEAN FILE NAME
// ======================================================

function sanitizeFileName(
  fileName: string
) {
  return fileName
    .trim()
    .replace(
      /\s+/g,
      '-'
    )
    .replace(
      /[^a-zA-Z0-9._-]/g,
      ''
    );
}


// ======================================================
// FILE EXTENSION
// ======================================================

function getFileExtension(
  fileName: string
) {
  const parts =
    fileName.split('.');


  if (
    parts.length <
    2
  ) {
    return '';
  }


  return (
    parts
      .pop()
      ?.toLowerCase() ??
    ''
  );
}


// ======================================================
// MIME TYPE
// ======================================================

function getMimeType(
  fileName: string,
  suppliedMimeType?: string | null
) {
  if (
    suppliedMimeType
  ) {
    return suppliedMimeType;
  }


  const extension =
    getFileExtension(
      fileName
    );


  switch (
    extension
  ) {
    case 'pdf':
      return 'application/pdf';


    case 'doc':
      return 'application/msword';


    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';


    case 'jpg':

    case 'jpeg':
      return 'image/jpeg';


    case 'png':
      return 'image/png';


    case 'webp':
      return 'image/webp';


    default:
      return 'application/octet-stream';
  }
}


// ======================================================
// UPLOAD FILE
// ======================================================

export async function uploadPrintingFile(
  file: PrintingUploadFile
): Promise<UploadedPrintingFile> {

  const user =
    await getCurrentUser();


  if (
    !file.uri
  ) {
    throw new Error(
      'File URI is missing.'
    );
  }


  if (
    !file.name
  ) {
    throw new Error(
      'File name is missing.'
    );
  }


  // ====================================================
  // SAFE FILE NAME
  // ====================================================

  const safeOriginalName =
    sanitizeFileName(
      file.name
    ) ||
    'printing-document';


  const extension =
    getFileExtension(
      safeOriginalName
    );


  const baseName =
    extension
      ? safeOriginalName.slice(
          0,
          -(
            extension.length +
            1
          )
        )
      : safeOriginalName;


  const uniquePart =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;


  const finalFileName =
    extension
      ? `${baseName}-${uniquePart}.${extension}`
      : `${baseName}-${uniquePart}`;


  // ====================================================
  // USER FOLDER
  // ====================================================

  const storagePath =
    `${user.id}/${finalFileName}`;


  const mimeType =
    getMimeType(
      file.name,
      file.mimeType
    );


  // ====================================================
  // READ LOCAL FILE
  // ====================================================

  const response =
    await fetch(
      file.uri
    );


  if (
    !response.ok
  ) {
    throw new Error(
      'Unable to read the selected file.'
    );
  }


  const arrayBuffer =
    await response.arrayBuffer();


  if (
    arrayBuffer.byteLength ===
    0
  ) {
    throw new Error(
      'The selected file is empty.'
    );
  }


  // ====================================================
  // UPLOAD
  // ====================================================

  const {
    error:
      uploadError,
  } =
    await supabase.storage
      .from(
        'printing-files'
      )
      .upload(
        storagePath,
        arrayBuffer,
        {
          contentType:
            mimeType,

          upsert:
            false,

          cacheControl:
            '3600',
        }
      );


  if (
    uploadError
  ) {
    console.error(
      'Printing file upload error:',
      uploadError
    );


    throw uploadError;
  }


  return {
    path:
      storagePath,

    fileName:
      finalFileName,

    mimeType,
  };
}


// ======================================================
// DELETE FILE
// ======================================================

export async function deletePrintingFile(
  storagePath: string
) {
  if (
    !storagePath
  ) {
    return;
  }


  const {
    error,
  } =
    await supabase.storage
      .from(
        'printing-files'
      )
      .remove([
        storagePath,
      ]);


  if (
    error
  ) {
    throw error;
  }
}


// ======================================================
// CREATE PRINTING REQUEST
// ======================================================

export async function createPrintingRequest(
  input: CreatePrintingRequestInput
): Promise<CreatedPrintingRequest> {

  const user =
    await getCurrentUser();


  // ====================================================
  // VALIDATION
  // ====================================================

  if (
    !input.file.uri ||
    !input.file.name
  ) {
    throw new Error(
      'Please select a document.'
    );
  }


  if (
    input.pageCount <
    1
  ) {
    throw new Error(
      'Page count must be at least 1.'
    );
  }


  if (
    input.copies <
    1
  ) {
    throw new Error(
      'Copies must be at least 1.'
    );
  }


  if (
    input.estimatedTotal <
    0
  ) {
    throw new Error(
      'Invalid printing total.'
    );
  }


  let uploadedFile:
    UploadedPrintingFile | null =
    null;


  try {

    // ==================================================
    // 1. UPLOAD DOCUMENT
    // ==================================================

    uploadedFile =
      await uploadPrintingFile(
        input.file
      );


    // ==================================================
    // 2. REQUEST NUMBER
    // ==================================================

    const requestNumber =
      generatePrintingRequestNumber();


    // ==================================================
    // 3. SAVE DATABASE REQUEST
    // ==================================================

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'printing_requests'
        )
        .insert({
          user_id:
            user.id,

          request_number:
            requestNumber,

          original_file_name:
            input.file.name,

          storage_path:
            uploadedFile.path,

          mime_type:
            uploadedFile.mimeType,

          file_size:
            input.file.size ??
            null,

          print_type:
            input.printType,

          paper_size:
            input.paperSize,

          print_side:
            input.printSide,

          page_count:
            input.pageCount,

          copies:
            input.copies,

          binding:
            input.binding,

          lamination:
            input.lamination,

          print_cost:
            input.printCost,

          binding_cost:
            input.bindingCost,

          lamination_cost:
            input.laminationCost,

          estimated_total:
            input.estimatedTotal,

          final_total:
            null,

          status:
            'Pending',

          customer_notes:
            input.customerNotes?.trim() ||
            null,

          staff_notes:
            null,
        })
        .select(`
          id,
          request_number,
          status,
          estimated_total,
          storage_path
        `)
        .single();


    if (
      error
    ) {
      throw error;
    }


    return {
      id:
        data.id,

      requestNumber:
        data.request_number,

      status:
        data.status,

      estimatedTotal:
        Number(
          data.estimated_total ??
            0
        ),

      storagePath:
        data.storage_path,
    };

  } catch (
    error
  ) {

    // ==================================================
    // IF DATABASE SAVE FAILS,
    // REMOVE UPLOADED FILE
    // ==================================================

    if (
      uploadedFile
    ) {
      try {
        await deletePrintingFile(
          uploadedFile.path
        );

      } catch (
        cleanupError
      ) {
        console.error(
          'Printing upload cleanup error:',
          cleanupError
        );
      }
    }


    throw error;
  }
}


// ======================================================
// GET MY PRINTING REQUESTS
// ======================================================

export async function getMyPrintingRequests() {
  const user =
    await getCurrentUser();


  const {
    data,
    error,
  } =
    await supabase
      .from(
        'printing_requests'
      )
      .select(`
        id,
        request_number,
        original_file_name,
        storage_path,
        mime_type,
        file_size,
        print_type,
        paper_size,
        print_side,
        page_count,
        copies,
        binding,
        lamination,
        print_cost,
        binding_cost,
        lamination_cost,
        estimated_total,
        final_total,
        status,
        customer_notes,
        staff_notes,
        created_at,
        updated_at
      `)
      .eq(
        'user_id',
        user.id
      )
      .order(
        'created_at',
        {
          ascending:
            false,
        }
      );


  if (
    error
  ) {
    throw error;
  }


  return data ?? [];
}


// ======================================================
// SIGNED URL
// ======================================================

export async function getPrintingFileSignedUrl(
  storagePath: string,
  expiresInSeconds =
    60 * 10
) {
  const {
    data,
    error,
  } =
    await supabase.storage
      .from(
        'printing-files'
      )
      .createSignedUrl(
        storagePath,
        expiresInSeconds
      );


  if (
    error
  ) {
    throw error;
  }


  return data.signedUrl;
}