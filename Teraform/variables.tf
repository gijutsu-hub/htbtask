variable "aws_region" {
  default = "us-east-1"
}

variable "dynamodb_table_name" {
  default = "HotelSessions"
}

variable "iam_user_name" {
  default = "joseph"
}

variable "policy_name" {
  default = "DynamoDBAccessPolicy"
}

variable "iam_role_name" {
  default = "DynamoDBRole"
}
