import type { AppProps } from 'next/app';
import '../styles/global.css';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}