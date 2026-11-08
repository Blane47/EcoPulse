terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.40"
    }
  }

  # State is kept locally by default, which is fine for a single-maintainer project.
  # For a shared/remote state, uncomment and create the bucket + lock table first:
  #
  # backend "s3" {
  #   bucket       = "ecopulse-tfstate-<account-id>"
  #   key          = "prod/terraform.tfstate"
  #   region       = "eu-west-1"
  #   use_lockfile = true
  # }
}
