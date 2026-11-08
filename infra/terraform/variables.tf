variable "aws_region" {
  description = "AWS region. Must be one where App Runner is available (e.g. eu-west-1, eu-central-1, us-east-1). eu-west-1 (Ireland) is a good low-latency choice from Cameroon."
  type        = string
  default     = "eu-west-1"
}

variable "project" {
  description = "Project name, used as a prefix for resource names."
  type        = string
  default     = "ecopulse"
}

variable "environment" {
  description = "Environment name (prod, staging, ...)."
  type        = string
  default     = "prod"
}

variable "api_image_tag" {
  description = "Tag of the API image in ECR that App Runner should run. Push an image with this tag before `terraform apply`."
  type        = string
  default     = "latest"
}

# App Runner instance size. Smallest (0.25 vCPU / 0.5 GB) keeps the bill lowest;
# raise if the API needs more memory. Valid cpu/memory combinations are listed in
# the App Runner docs.
variable "api_cpu" {
  description = "vCPU units for the API (256 = 0.25 vCPU, 512 = 0.5, 1024 = 1)."
  type        = string
  default     = "256"
}

variable "api_memory" {
  description = "Memory (MB) for the API (512 = 0.5 GB, 1024 = 1 GB, 2048 = 2 GB)."
  type        = string
  default     = "512"
}

variable "api_min_size" {
  description = "Minimum number of running API instances (1 keeps one warm; App Runner has no scale-to-zero)."
  type        = number
  default     = 1
}

variable "api_max_size" {
  description = "Maximum number of API instances App Runner may scale to."
  type        = number
  default     = 2
}

variable "api_max_concurrency" {
  description = "Requests per instance before App Runner scales out."
  type        = number
  default     = 100
}
