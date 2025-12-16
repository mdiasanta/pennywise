import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export function GoogleSignInButton() {
  const { loginWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast({
        title: 'Sign in failed',
        description: 'No credential received from Google',
        variant: 'destructive',
      });
      return;
    }

    try {
      await loginWithGoogle(credentialResponse.credential);
      toast({
        title: 'Welcome!',
        description: 'You have successfully signed in.',
      });
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: error instanceof Error ? error.message : 'Failed to sign in',
        variant: 'destructive',
      });
    }
  };

  const handleError = () => {
    toast({
      title: 'Sign in failed',
      description: 'Google sign in was cancelled or failed',
      variant: 'destructive',
    });
  };

  return (
    <GoogleLogin
      onSuccess={handleSuccess}
      onError={handleError}
      useOneTap={false}
      theme="outline"
      size="large"
      shape="rectangular"
      locale="en"
    />
  );
}
