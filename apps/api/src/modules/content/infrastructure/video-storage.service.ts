import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VideoStorageService {
  private readonly client = new S3Client({
    region: process.env.S3_REGION ?? 'eu-central-1',
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9100',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? 'matiq',
      secretAccessKey: process.env.S3_SECRET_KEY ?? 'matiq-local-only',
    },
  });
  playbackUrl(key: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PRODUCTION_VIDEO_PROVIDER_REQUIRED');
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET ?? 'matiq-local', Key: key }),
      { expiresIn: 300 },
    );
  }
}
