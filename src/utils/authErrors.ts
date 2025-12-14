/**
 * Converts Firebase authentication error codes to user-friendly messages
 */
export function getAuthErrorMessage(error: any): string {
  const errorCode = error?.code || '';
  const message = error?.message || '';

  // Map Firebase error codes to user-friendly messages
  const errorMap: { [key: string]: string } = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/user-not-found': 'No account found with this email. Please sign up instead.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-login-credentials': 'Invalid email or password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists. Please sign in instead.',
    'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
    'auth/operation-not-allowed': 'This operation is not allowed. Please contact support.',
    'auth/too-many-requests': 'Too many login attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection and try again.',
    'auth/invalid-credential': 'Invalid credentials. Please check your email and password.',
    'auth/missing-email': 'Please enter your email address.',
    'auth/missing-password': 'Please enter your password.',
  };

  // Return mapped message or fallback to generic message
  return errorMap[errorCode] || 'An error occurred. Please try again.';
}
