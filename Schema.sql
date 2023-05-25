drop table added_movie;
create table if not exists added_movie(
     id serial primary key,
     title varchar(255),
     overview varchar(10000),
     comment varchar(500)
)