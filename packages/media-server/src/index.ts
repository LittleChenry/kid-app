import express from 'express';
import cors from 'cors';
import { join } from 'path';
import { videoRouter } from './routes/video.js';
import { scanVideos } from './services/transcoder.js';

const app = express();
const PORT = 4001;
const HLS_OUTPUT = process.env.HLS_OUTPUT || './data/hls';

app.use(cors());
app.use(express.json());
app.use('/media', videoRouter);
app.use('/media/hls', express.static(HLS_OUTPUT));

app.get('/media/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, async () => {
  console.log(`Media Server running on http://localhost:${PORT}`);
  console.log(`HLS output: ${join(process.cwd(), HLS_OUTPUT)}`);
  // Warm up video scan cache
  try {
    const count = (await scanVideos()).length;
    console.log(`Scan complete: ${count} videos found`);
  } catch (err) {
    console.warn(`Initial scan failed: ${err}`);
  }
});
