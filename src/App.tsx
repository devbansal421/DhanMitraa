import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { I18nProvider } from '@/i18n';
import { PreferencesProvider } from '@/preferences';
import { StoreProvider } from '@/store';
import { WalletProvider } from '@/wallet';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Toasts } from '@/components/Toasts';
import { DemoModal } from '@/components/DemoModal';
import { AssistantWidget } from '@/components/AssistantWidget';
import { OverviewPage } from '@/pages/OverviewPage';
import { CropsPage } from '@/pages/CropsPage';
import { CropDetailPage } from '@/pages/CropDetailPage';
import { ContractsPage } from '@/pages/ContractsPage';
import { ContractDetailPage } from '@/pages/ContractDetailPage';
import { SettlementPage } from '@/pages/SettlementPage';
import { NetworkPage } from '@/pages/NetworkPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { WalletPage } from '@/pages/WalletPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthGate } from '@/components/AuthGate';

function AppShell() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Header />
        <main className="px-4 py-6 pb-24 sm:px-6 sm:py-8 lg:px-8 lg:pb-8">
          <div key={location.pathname} className="animate-fade-in">
            <Routes>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/crops" element={<CropsPage />} />
              <Route path="/crops/:cropId" element={<CropDetailPage />} />
              <Route path="/contracts" element={<ContractsPage />} />
              <Route path="/contracts/:contractId" element={<ContractDetailPage />} />
              <Route path="/settlement" element={<SettlementPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/network" element={<NetworkPage />} />
              <Route path="/network/:participantId" element={<NetworkPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </div>
        </main>
      </div>
      <Toasts />
      <DemoModal />
      <AssistantWidget />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
        <PreferencesProvider>
          <AuthGate>
            <StoreProvider>
              <WalletProvider>
                <AppShell />
              </WalletProvider>
            </StoreProvider>
          </AuthGate>
        </PreferencesProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
