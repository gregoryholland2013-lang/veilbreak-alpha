# Veilbreak Alpha Notes

## Alpha Version
**Veilbreak Alpha v0.1**

## Current Stable Checkpoint
- Supabase auth is working
- Vercel live deployment is working
- Login/logout flow is working
- Home screen underlay is working
- Quests are seeded and visible
- Profile stats added:
  - Stamina
  - Attack Energy
  - Defense Energy
- Resource regeneration functions added in Supabase
- Supabase profile table uses:
  - `profiles.id = auth.users.id`

## Current Core Loop
1. User signs up or logs in
2. Profile loads from Supabase
3. Home screen loads
4. User can view quests
5. User can summon cards
6. User can view collection
7. User can build a deck

## Important Supabase Structure
Profiles table:

```txt
public.profiles