output "api_url" {
  description = "Base URL of the deployed API. Build the dashboard with VITE_API_URL set to this plus /api."
  value       = "https://${aws_apprunner_service.api.service_url}"
}

output "ecr_repository_url" {
  description = "Push the API image here (tag it with var.api_image_tag)."
  value       = aws_ecr_repository.api.repository_url
}

output "dashboard_url" {
  description = "Public URL of the admin dashboard."
  value       = "https://${aws_cloudfront_distribution.dashboard.domain_name}"
}

output "dashboard_bucket" {
  description = "S3 bucket to sync the dashboard build (dist/) into."
  value       = aws_s3_bucket.dashboard.bucket
}

output "dashboard_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidations after a deploy)."
  value       = aws_cloudfront_distribution.dashboard.id
}

output "photos_bucket" {
  description = "S3 bucket for report and proof photos."
  value       = aws_s3_bucket.photos.bucket
}

output "mongodb_uri_secret_arn" {
  description = "Secrets Manager ARN to set the MongoDB Atlas connection string on."
  value       = aws_secretsmanager_secret.mongodb_uri.arn
}

output "jwt_secret_arn" {
  description = "Secrets Manager ARN to set the JWT signing secret on."
  value       = aws_secretsmanager_secret.jwt_secret.arn
}
