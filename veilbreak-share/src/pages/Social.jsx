import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PageHeader from '@/components/game/PageHeader';
import FriendsList from '@/components/social/FriendsList';
import BazaarTab from '@/components/social/BazaarTab';
import PrivateTradesTab from '@/components/social/PrivateTradesTab';
import { Users, Store, ArrowLeftRight } from 'lucide-react';

export default function Social() {
  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Social & Trade" />
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mx-0 rounded-none border-b border-border bg-card/50 h-10">
          <TabsTrigger value="friends" className="gap-1.5 text-xs"><Users className="w-3.5 h-3.5" />Friends</TabsTrigger>
          <TabsTrigger value="bazaar" className="gap-1.5 text-xs"><Store className="w-3.5 h-3.5" />Bazaar</TabsTrigger>
          <TabsTrigger value="private" className="gap-1.5 text-xs"><ArrowLeftRight className="w-3.5 h-3.5" />Private</TabsTrigger>
        </TabsList>
        <TabsContent value="friends" className="mt-0">
          <FriendsList />
        </TabsContent>
        <TabsContent value="bazaar" className="mt-0">
          <BazaarTab />
        </TabsContent>
        <TabsContent value="private" className="mt-0">
          <PrivateTradesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}