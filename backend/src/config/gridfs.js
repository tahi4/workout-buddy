import mongoose from 'mongoose';
import { Readable } from 'stream';

const GRIDFS_BUCKET_NAME = 'challengeProofs';

function getProofBucket() {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready for GridFS operations');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: GRIDFS_BUCKET_NAME,
  });
}

export async function uploadProofToGridFS({ buffer, filename, contentType, metadata }) {
  const bucket = getProofBucket();

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
      metadata,
    });

    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        resolve({
          fileId: String(uploadStream.id),
          filename: uploadStream.filename,
          contentType,
          size: uploadStream.length,
          bucket: GRIDFS_BUCKET_NAME,
        });
      });
  });
}

export async function deleteProofFromGridFS(fileId) {
  const bucket = getProofBucket();
  await bucket.delete(new mongoose.Types.ObjectId(fileId));
}

export function getProofDownloadStream(fileId) {
  const bucket = getProofBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
}
