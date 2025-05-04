-- Add position history table
create table note_position_history (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid references notes(id) on delete cascade,
  previous_lat double precision not null,
  previous_lng double precision not null,
  new_lat double precision not null,
  new_lng double precision not null,
  changed_at timestamp with time zone default now() not null,
  changed_by uuid references auth.users(id) not null
);

-- Add RLS policies for position history
alter table note_position_history enable row level security;

create policy "Users can read their notes' position history"
  on note_position_history
  for select
  using (
    exists (
      select 1 from notes
      where notes.id = note_position_history.note_id
      and notes.user_id = auth.uid()
    )
  );

create policy "Users can insert their notes' position history"
  on note_position_history
  for insert
  with check (
    exists (
      select 1 from notes
      where notes.id = note_position_history.note_id
      and notes.user_id = auth.uid()
    )
  );

-- Add position update trigger
create function log_position_change() returns trigger as $$
begin
  if (OLD.latitude != NEW.latitude or OLD.longitude != NEW.longitude) then
    insert into note_position_history (
      note_id,
      previous_lat,
      previous_lng,
      new_lat,
      new_lng,
      changed_by
    ) values (
      NEW.id,
      OLD.latitude,
      OLD.longitude,
      NEW.latitude,
      NEW.longitude,
      auth.uid()
    );
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger note_position_change
  before update on notes
  for each row
  execute function log_position_change(); 