-- Function to delete a user by ID, callable by admins only
create or replace function delete_user_by_id(target_user_id uuid) returns void language plpgsql security definer as $$ begin -- Check if the executing user is an admin
    -- We check public.profiles for the role 'admin'
    if not exists (
        select 1
        from public.profiles
        where id = auth.uid()
            and role = 'admin'
    ) then raise exception 'Access denied: only admins can delete users';
end if;
-- Delete the user from auth.users (this usually cascades to public.profiles)
delete from auth.users
where id = target_user_id;
end;
$$;