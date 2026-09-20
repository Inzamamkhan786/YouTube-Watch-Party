/** 200 – OK */
function sendSuccess(
  res,
  data,
  message,
  statusCode = 200
) {
  const body = {
    success: true,
    data,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  }
  res.status(statusCode).json(body)
}

/** 201 – Created */
function sendCreated(res, data, message) {
  sendSuccess(res, data, message, 201)
}

/** 4xx / 5xx – Error */
function sendError(
  res,
  error,
  statusCode = 500,
  message
) {
  const body = {
    success: false,
    error,
    ...(message && { message }),
    timestamp: new Date().toISOString(),
  }
  res.status(statusCode).json(body)
}

module.exports = { sendSuccess, sendCreated, sendError }
