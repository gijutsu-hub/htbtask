# --- DYNAMODB TABLE ---
resource "aws_dynamodb_table" "hotel_sessions" {
  name           = var.dynamodb_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sessionId"

  attribute {
    name = "sessionId"
    type = "S"
  }
}

# --- IAM USER (Joseph) ---
resource "aws_iam_user" "joseph" {
  name = var.iam_user_name
}

# --- IAM POLICY (Allow DynamoDB Access) ---
resource "aws_iam_policy" "dynamodb_policy" {
  name        = var.policy_name
  description = "Allow listing, updating, and deleting items in DynamoDB"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = [
          "dynamodb:ListTables",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.hotel_sessions.arn
      }
    ]
  })
}

# --- ATTACH POLICY TO IAM USER ---
resource "aws_iam_user_policy_attachment" "joseph_policy_attach" {
  user       = aws_iam_user.joseph.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}

# --- CREATE ACCESS KEY FOR USER ---
resource "aws_iam_access_key" "joseph_keys" {
  user = aws_iam_user.joseph.name
}

# --- IAM ROLE (Not directly used but can be expanded) ---
resource "aws_iam_role" "dynamodb_role" {
  name = var.iam_role_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "*"
        }
      }
    ]
  })
}

# --- ATTACH POLICY TO ROLE ---
resource "aws_iam_role_policy_attachment" "role_policy_attach" {
  role       = aws_iam_role.dynamodb_role.name
  policy_arn = aws_iam_policy.dynamodb_policy.arn
}
