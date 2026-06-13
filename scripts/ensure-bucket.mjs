import { S3Client, CreateBucketCommand, PutBucketAclCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

const endpoint = process.env.S3_ENDPOINT || 'http://storage:8333';
const bucket = process.env.S3_BUCKET || 'strapi-media';
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'vyasta';
const secretAccessKey = process.env.AWS_ACCESS_SECRET || 'vyastapass';

const client = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

async function ensureBucket() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    console.log(`Bucket "${bucket}" already exists.`);
  } catch {
    console.log(`Creating bucket "${bucket}"...`);
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(new PutBucketAclCommand({
      Bucket: bucket,
      ACL: 'public-read',
    }));
    console.log(`Bucket "${bucket}" created and set to public-read.`);
  }
}

ensureBucket()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to create bucket:', err.message);
    process.exit(1);
  });
