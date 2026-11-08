# EcoPulse — AWS Infrastructure (Terraform)

Infrastructure-as-code for deploying EcoPulse to AWS. This defines the cloud
environment; **nothing is deployed until you run `terraform apply`.** The design
keeps running costs low and uses no sensors or special hardware.

## What it provisions

| Resource | Purpose |
|---|---|
| **AWS App Runner** | Runs the API (Node/Express) as a container. Managed, autoscaling, no servers or load balancer. |
| **Amazon ECR** | Private registry holding the API image App Runner runs. |
| **AWS Secrets Manager** | Holds `MONGODB_URI` and `JWT_SECRET`, injected into the API at runtime. |
| **Amazon S3 + CloudFront** | Serves the React admin dashboard as a static site (bucket private, read only through CloudFront). |
| **Amazon S3 (photos)** | Private bucket for report/proof photos (target state — see note below). |
| **IAM roles** | Least-privilege access: App Runner pulls from ECR and reads only its two secrets and the photos bucket. |

The database is **MongoDB Atlas** (free tier, runs on AWS), kept as a managed
third-party service rather than migrating to DocumentDB — Atlas is free at this
scale, fully MongoDB-compatible, and needs no VPC. App Runner reaches it over TLS.

## Prerequisites

- An AWS account and the **AWS CLI** configured (`aws configure`).
- **Terraform** >= 1.5.
- **Docker** (to build and push the API image).
- A region where **App Runner is available** (default `eu-west-1`; also e.g. `eu-central-1`, `us-east-1`).

## Deploy (first time)

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # edit if needed
terraform init

# 1. Create the registry and the (empty) secret containers first.
terraform apply \
  -target=aws_ecr_repository.api \
  -target=aws_secretsmanager_secret.mongodb_uri \
  -target=aws_secretsmanager_secret.jwt_secret

# 2. Set the real secret values (never stored in Terraform).
aws secretsmanager put-secret-value --secret-id ecopulse-prod/mongodb-uri \
  --secret-string 'mongodb+srv://USER:PASS@cluster.mongodb.net/ecopulse?retryWrites=true&w=majority'
aws secretsmanager put-secret-value --secret-id ecopulse-prod/jwt-secret \
  --secret-string "$(openssl rand -hex 32)"

# 3. Build and push the API image to ECR.
ECR=$(terraform output -raw ecr_repository_url)
REGION=$(terraform output -raw api_url >/dev/null 2>&1; echo eu-west-1)   # or your region
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "${ECR%/*}"
docker build -t "$ECR:latest" ../../server
docker push "$ECR:latest"

# 4. Create everything else (App Runner, S3, CloudFront).
terraform apply
```

## Deploy the dashboard

The dashboard is a static build that must point at the deployed API:

```bash
API=$(terraform -chdir=infra/terraform output -raw api_url)
BUCKET=$(terraform -chdir=infra/terraform output -raw dashboard_bucket)
DIST=$(terraform -chdir=infra/terraform output -raw dashboard_distribution_id)

cd client
VITE_API_URL="$API/api" npm run build
aws s3 sync dist/ "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/*'
```

Open the dashboard at the `dashboard_url` output.

## Updating the API later

```bash
docker build -t "$ECR:latest" server && docker push "$ECR:latest"
aws apprunner start-deployment --service-arn <api-service-arn>
```

(Or wire this into GitHub Actions: build on push, push to ECR, trigger a deployment.)

## Tear down

```bash
terraform destroy
```

Buckets use `force_destroy` and secrets have a zero-day recovery window, so a
destroy removes everything cleanly.

## Notes

- **Photos:** the bucket and the API's access to it are provisioned now, but the
  API still stores photos in MongoDB. Moving uploads to S3 (presigned PUT/GET) is
  a code-only follow-up — the infrastructure is ready for it.
- **State:** kept locally by default. For team use, enable the S3 backend block in
  `versions.tf` (create the bucket first).
- **Cost:** App Runner bills for the running instance (smallest size by default),
  plus minimal S3/CloudFront/ECR usage. Atlas, OpenStreetMap, and GitHub Actions
  are free at this scale. `terraform destroy` stops all charges.
