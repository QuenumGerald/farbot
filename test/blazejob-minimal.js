import { BlazeJob } from 'blazerjob';

const jobs = new BlazeJob({ dbPath: '/home/nova/Documents/projects/farbot/src/data/blazerjob.db' });
jobs.schedule(async () => {
  console.log('🔥 Tâche exécutée à', new Date());
}, {
  runAt: new Date(Date.now() + 5000), // dans 5 secondes
  interval: 10000 // toutes les 10 secondes
});
jobs.start();
