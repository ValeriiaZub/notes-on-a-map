# Notes on a Map 📍📝

A mobile-first web application that allows users to create location-based notes and visualize them on a map.

## Tech Stack

- **Frontend Framework**: Next.js 14 (React)
- **Styling**: Tailwind CSS
- **Maps**: Mapbox GL JS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel

## Implementation Steps

### 1. Project Setup and Authentication (Foundation)
- [ ] Initialize Next.js project with TypeScript and Tailwind CSS
- [ ] Set up Supabase project and configure environment variables
- [ ] Implement user authentication (sign up, login, logout)
- [ ] Create database schema for users and notes
- [ ] Set up protected routes and authentication context

### 2. Note Creation Interface (Core Feature)
- [ ] Create mobile-friendly note input component
- [ ] Implement geolocation functionality using browser's Geolocation API
- [ ] Design note creation form with:
  - Text input for note content
  - Automatic location capture
  - Optional location adjustment
- [ ] Add error handling for location services
- [ ] Implement note saving to Supabase

### 3. Map Integration (Visualization)
- [ ] Set up Mapbox GL JS integration
- [ ] Create responsive map component
- [ ] Implement current location centering
- [ ] Add map markers for saved notes
- [ ] Style map markers and implement clustering for multiple notes

### 4. Note Interaction (User Experience)
- [ ] Create note marker popup component
- [ ] Implement note viewing functionality
- [ ] Add note editing and deletion features
- [ ] Add animations for marker interactions
- [ ] Implement note filtering and search

### 5. Data Management (Backend)
- [ ] Set up Supabase real-time subscriptions for live updates
- [ ] Implement offline support with local storage
- [ ] Add data synchronization
- [ ] Implement data validation and sanitization
- [ ] Add error boundaries and loading states

### 6. Polish and Optimization
- [ ] Add loading states and animations
- [ ] Implement error handling and user feedback
- [ ] Add progressive web app (PWA) support
- [ ] Optimize performance and lazy loading
- [ ] Add share functionality for notes

## Database Schema

```sql
-- Users table (handled by Supabase Auth)
-- Notes table
create table notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  latitude double precision not null,
  longitude double precision not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table notes enable row level security;

-- Create policies
create policy "Users can read their own notes" on notes
  for select using (auth.uid() = user_id);

create policy "Users can create their own notes" on notes
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own notes" on notes
  for update using (auth.uid() = user_id);

create policy "Users can delete their own notes" on notes
  for delete using (auth.uid() = user_id);
```

## Environment Variables

```plaintext
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your environment variables
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- 📝 Create and edit location-based notes
- 📍 Automatic location detection
- 🗺️ Interactive map visualization
- 🔒 Secure user authentication
- 💾 Real-time data synchronization
- 📱 Mobile-first responsive design
- 🌐 Offline support
- 🔍 Search and filter notes
- 📤 Share notes with others

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request