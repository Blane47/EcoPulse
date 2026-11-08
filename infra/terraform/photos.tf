# Bucket for report and proof-of-collection photos. Today the API stores photos
# inside MongoDB; the planned change is to upload them here instead (the apps PUT
# to a presigned URL, and the API serves them with a presigned GET). The bucket and
# the API's access to it (see apprunner.tf) are provisioned now so that change is a
# code-only step. The bucket is private — no public access.

resource "aws_s3_bucket" "photos" {
  bucket        = "${local.name}-photos-${local.account_id}"
  force_destroy = true
}

resource "aws_s3_bucket_public_access_block" "photos" {
  bucket                  = aws_s3_bucket.photos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Allow the apps to upload directly to a presigned URL from a browser/phone.
resource "aws_s3_bucket_cors_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["*"] # tighten to the dashboard and app origins in production
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Expire photos after a year to keep storage small; adjust to your retention policy.
resource "aws_s3_bucket_lifecycle_configuration" "photos" {
  bucket = aws_s3_bucket.photos.id

  rule {
    id     = "expire-old-photos"
    status = "Enabled"

    filter {}

    expiration {
      days = 365
    }
  }
}
