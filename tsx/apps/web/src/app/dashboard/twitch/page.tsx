'use client';

import { redirect } from 'next/navigation';

export default function TwitchPage() {
  redirect('/dashboard/create?platform=twitch');
}
