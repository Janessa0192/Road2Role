/** Turns an ApiError (or anything thrown) into a user-facing message. Same wording as the old state.js. */
export function showError(error, fallback = 'Something went wrong.') {
  if (!error) return '';
  if (error.code === 'network_error') return 'Network error - is the server running?';
  return error.message || fallback;
}
