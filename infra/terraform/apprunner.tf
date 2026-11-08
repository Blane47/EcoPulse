# The API runs on AWS App Runner: a fully managed container service (no VPC, load
# balancer or servers to run). It pulls the image from ECR, injects config from
# Secrets Manager, health-checks /api/health, and autoscales on request concurrency.
# Egress is public, so it reaches MongoDB Atlas over TLS with no VPC connector.

# --- IAM: access role (lets App Runner pull the private ECR image) ---
data "aws_iam_policy_document" "apprunner_access_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_access" {
  name               = "${local.name}-apprunner-ecr-access"
  assume_role_policy = data.aws_iam_policy_document.apprunner_access_assume.json
}

resource "aws_iam_role_policy_attachment" "apprunner_access" {
  role       = aws_iam_role.apprunner_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# --- IAM: instance role (the running service's own identity) ---
data "aws_iam_policy_document" "apprunner_instance_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_instance" {
  name               = "${local.name}-apprunner-instance"
  assume_role_policy = data.aws_iam_policy_document.apprunner_instance_assume.json
}

data "aws_iam_policy_document" "apprunner_instance" {
  # Read only the two secrets this service needs.
  statement {
    sid       = "ReadAppSecrets"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.mongodb_uri.arn, aws_secretsmanager_secret.jwt_secret.arn]
  }

  # Read/write report & proof photos (used once the API serves photos from S3).
  statement {
    sid       = "PhotoObjects"
    actions   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
    resources = ["${aws_s3_bucket.photos.arn}/*"]
  }

  statement {
    sid       = "PhotoBucket"
    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.photos.arn]
  }
}

resource "aws_iam_role_policy" "apprunner_instance" {
  name   = "${local.name}-apprunner-instance"
  role   = aws_iam_role.apprunner_instance.id
  policy = data.aws_iam_policy_document.apprunner_instance.json
}

# --- Autoscaling: how many instances, and when to add more ---
resource "aws_apprunner_auto_scaling_configuration_version" "api" {
  auto_scaling_configuration_name = substr(replace("${local.name}-api", "_", "-"), 0, 32)

  max_concurrency = var.api_max_concurrency
  min_size        = var.api_min_size
  max_size        = var.api_max_size

  lifecycle {
    create_before_destroy = true
  }
}

# --- The service ---
resource "aws_apprunner_service" "api" {
  service_name = "${local.name}-api"

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.api_image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"

        runtime_environment_variables = {
          NODE_ENV      = "production"
          PORT          = "8080"
          APP_TIMEZONE  = "Africa/Douala"
          PHOTOS_BUCKET = aws_s3_bucket.photos.bucket
        }

        # Injected from Secrets Manager at runtime (never in the image or state).
        runtime_environment_secrets = {
          MONGODB_URI = aws_secretsmanager_secret.mongodb_uri.arn
          JWT_SECRET  = aws_secretsmanager_secret.jwt_secret.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.api_cpu
    memory            = var.api_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.api.arn

  # The image and secret values must exist before the first apply — see the runbook.
  depends_on = [
    aws_iam_role_policy_attachment.apprunner_access,
    aws_iam_role_policy.apprunner_instance,
  ]
}
