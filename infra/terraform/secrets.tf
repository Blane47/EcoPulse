# The API's sensitive configuration lives in Secrets Manager, not in Terraform state
# or the image. Terraform creates the secret containers with a placeholder; you set the
# real values out-of-band (see the runbook), and Terraform never overwrites them.

resource "aws_secretsmanager_secret" "mongodb_uri" {
  name                    = "${local.name}/mongodb-uri"
  description             = "MongoDB Atlas connection string for the EcoPulse API"
  recovery_window_in_days = 0 # delete immediately on destroy (student environment)
}

resource "aws_secretsmanager_secret_version" "mongodb_uri" {
  secret_id     = aws_secretsmanager_secret.mongodb_uri.id
  secret_string = "SET-ME-VIA-CLI"

  # The real value is set with `aws secretsmanager put-secret-value`; don't revert it.
  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${local.name}/jwt-secret"
  description             = "Secret used to sign EcoPulse JWTs"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "SET-ME-VIA-CLI"

  lifecycle {
    ignore_changes = [secret_string]
  }
}
