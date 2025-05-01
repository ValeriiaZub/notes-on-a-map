-- Add sync related columns
alter table notes add column
  sync_status text check (sync_status in ('synced', 'pending', 'conflict')) 
  default 'synced';

alter table notes add column
  last_synced_at timestamp with time zone;

alter table notes add column
  version integer default 1;

-- Add indexes for better performance
create index notes_user_id_created_at_idx 
  on notes(user_id, created_at);

create index notes_sync_status_idx 
  on notes(sync_status);

-- Enable real-time for notes table
alter publication supabase_realtime add table notes; 