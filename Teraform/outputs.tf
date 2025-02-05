output "dynamodb_table_name" {
  value = aws_dynamodb_table.hotel_sessions.name
}

output "iam_user_name" {
  value = aws_iam_user.joseph.name
}

output "access_key_id" {
  value = aws_iam_access_key.joseph_keys.id
  sensitive = true
}

output "secret_access_key" {
  value = aws_iam_access_key.joseph_keys.secret
  sensitive = true
}
