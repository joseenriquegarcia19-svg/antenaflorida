-- Update default station to use the correct direct streaming URL
update public.stations
set 
  stream_url = 'https://streaming.live365.com/a84668'
where name = 'Antena Radio';
