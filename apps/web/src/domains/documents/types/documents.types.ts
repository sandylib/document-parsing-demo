export interface DocumentSummary {id:string;title:string;visibility:'public'|'staff';currentVersionId?:string;versionNumber?:number;status?:string;warnings:string[];createdAt:string}
export interface UploadReceipt {documentId:string;versionId:string;jobId:string;duplicate:boolean}
