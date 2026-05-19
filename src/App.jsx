import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import GameLayout from './components/game/GameLayout';
import Home from './pages/Home';
import Collection from './pages/Collection';
import Summon from './pages/Summon';
import DeckBuilder from './pages/DeckBuilder';
import Battle from './pages/Battle.jsx';
import Quests from './pages/Quests';
import Mailbox from './pages/Mailbox';
import Enhance from './pages/Enhance';
import Social from './pages/Social';
import GuildPage from './pages/Guild';
import EventDungeon from './pages/EventDungeon';
import HolyWars from './pages/HolyWars';

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route element={<GameLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/summon" element={<Summon />} />
        <Route path="/deck-builder" element={<DeckBuilder />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/quests" element={<Quests />} />
        <Route path="/mailbox" element={<Mailbox />} />
        <Route path="/enhance" element={<Enhance />} />
        <Route path="/social" element={<Social />} />
        <Route path="/guild" element={<GuildPage />} />
        <Route path="/event" element={<EventDungeon />} />
        <Route path="/holy-wars" element={<HolyWars />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthenticatedApp />
      </Router>

      <Toaster />
    </QueryClientProvider>
  );
}

export default App;