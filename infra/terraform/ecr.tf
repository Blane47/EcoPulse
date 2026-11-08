# Private registry for the API container image. Build and push to this repo,
# then App Runner pulls the tagged image from here.
resource "aws_ecr_repository" "api" {
  name                 = "${local.name}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # allow `terraform destroy` even with images present

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Keep only the 10 most recent images so the registry doesn't grow forever.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
