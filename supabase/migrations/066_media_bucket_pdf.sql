-- The `media` bucket was created for images only: 5 MB cap and an image-only
-- mime allowlist. Email PDF attachments upload into the same bucket, so every
-- PDF was rejected by Storage, and any image over 5 MB with it.
--
-- Raise the cap to 25 MB and allow application/pdf. Uploads now go straight
-- from the browser to Storage through a signed upload URL, so this limit is
-- the only one that applies — the 4 MB Server Action body limit no longer is.

update storage.buckets
set
  file_size_limit = 26214400,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'application/pdf'
  ]
where id = 'media';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'media',
  'media',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'application/pdf'
  ]
where not exists (select 1 from storage.buckets where id = 'media');
