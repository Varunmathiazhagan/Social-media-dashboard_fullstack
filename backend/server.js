import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import puppeteer from 'puppeteer';
import Sentiment from 'sentiment';
import path from 'path';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const YT_API_KEY = 'AIzaSyDuwfJ9vJFs9CYAzt6s_RZ1WbYiWe0JtEc';
const sentiment = new Sentiment();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ---------------------------
// MongoDB Configuration
// ---------------------------
mongoose.connect('mongodb+srv://mvarunmathi2004:4546@cluster0.cwbdpuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

// ---------------------------
// Profile Schema and Model
// ---------------------------
const ProfileSchema = new mongoose.Schema({
    username: String,
    posts: String,
    profile_photo: String,
    following: String,
    followers: String,
    joined_date: String,
    bio: String,
    tweets: Array,
}, { timestamps: true });
const Profile = mongoose.model('Profile', ProfileSchema);

// ---------------------------
// YouTube Channel Schema and Model
// ---------------------------
const YouTubeChannelSchema = new mongoose.Schema({
    channelName: String,
    channelThumbnail: String,
    totalViews: String,
    totalSubscribers: String,
    totalVideos: String,
    recentVideos: [
        {
            title: String,
            description: String,
            publishedAt: Date,
            likes: Number,
            comments: Number,
            views: Number,
        },
    ],
}, { timestamps: true });
const YouTubeChannel = mongoose.model('YouTubeChannel', YouTubeChannelSchema);

// ---------------------------
// Serve API endpoints
// ---------------------------
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Social Media Dashboard API.',
        twitter: '/twitter',
        youtube: '/youtube'
    });
});
app.get('/y', (req, res) => {
    res.json({
        message: 'Use /twitter for Twitter engagement and /youtube for YouTube dashboard.'
    });
});
app.get('/twitter', (req, res) => {
    res.json({ message: 'Twitter Engagement API endpoint.' });
});
app.get('/youtube', (req, res) => {
    res.json({ message: 'YouTube Dashboard API endpoint.' });
});

// ---------------------------
// Twitter Profile Data Fetching
// ---------------------------
async function fetchProfileData(username) {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: 'C:\\Users\\mvaru\\AppData\\Local\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--allow-running-insecure-content',
        ],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    try {
        await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
        await page.waitForSelector('.r-n6v787', { timeout: 10000 });
        await page.waitForSelector('img[src*="profile_images"]', { timeout: 10000 });
        const profileData = await page.evaluate((username) => {
            const posts = document.querySelector('.r-n6v787')?.textContent || "0";
            const profilePhoto = document.querySelector('img[src*="profile_images"]')?.src || '';
            const following = document.querySelector(`a[href="/${username}/following"] span`)?.textContent || "0";
            const followers = document.querySelector(`a[href="/${username}/verified_followers"] span`)?.textContent || "0";
            const joinedDateElement = Array.from(document.querySelectorAll('span')).find(span => span.textContent.includes('Joined'));
            const joinedDate = joinedDateElement ? joinedDateElement.textContent : "0";
            const bio = document.querySelector('div[data-testid="UserDescription"]')?.innerText || '';
            return {
                posts,
                profile_photo: profilePhoto,
                following,
                followers,
                joined_date: joinedDate,
                bio,
            };
        }, username);
        const tweets = await fetchTweets(page);
        await browser.close();
        return { ...profileData, tweets };
    } catch (err) {
        console.error('Error during Twitter profile data fetching:', err);
        await browser.close();
        return { error: 'Error fetching Twitter profile data. Please check the username.' };
    }
}
async function fetchTweets(page) {
    try {
        await page.waitForSelector('article', { timeout: 10000 });
        const tweets = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('article')).slice(0, 10).map(tweet => {
                const text = tweet.querySelector('div[lang]')?.innerText || '';
                const date = tweet.querySelector('time')?.getAttribute('datetime') || '';
                const likes = tweet.querySelector('div[data-testid="like"] span')?.innerText || '0';
                return { text, date, likes };
            });
        });
        return tweets.map(tweet => {
            const sentimentResult = sentiment.analyze(tweet.text);
            return {
                ...tweet,
                sentiment: sentimentResult.score,
                comparative: sentimentResult.comparative,
            };
        });
    } catch (err) {
        console.error('Error fetching tweets:', err);
        return [];
    }
}
app.post('/get_profile', async (req, res) => {
    const username = req.body.username;
    if (!username) {
        return res.status(400).json({ message: 'Username is required!' });
    }
    const profileData = await fetchProfileData(username);
    if (profileData.error) {
        return res.status(400).json({ message: profileData.error });
    }
    const newProfile = new Profile(profileData);
    await newProfile.save();
    res.json(profileData);
});

// ---------------------------
// YouTube API Integration
// ---------------------------
app.get('/api/channel/:channelName', async (req, res) => {
    const { channelName } = req.params;
    try {
        const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                q: channelName,
                key: YT_API_KEY,
                type: 'channel',
            },
        });
        if (searchResponse.data.items.length === 0) {
            return res.status(404).json({ error: 'Channel not found. Please check the channel name.' });
        }
        const channelId = searchResponse.data.items[0].id.channelId;
        const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
            params: {
                part: 'statistics,snippet',
                id: channelId,
                key: YT_API_KEY,
            },
        });
        const channelData = channelResponse.data.items[0];
        const stats = channelData.statistics;
        const snippet = channelData.snippet;
        const channelInfo = {
            channelName: snippet.title,
            channelThumbnail: snippet.thumbnails.default.url,
            totalViews: stats.viewCount,
            totalSubscribers: stats.subscriberCount,
            totalVideos: stats.videoCount,
        };
        const videosResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
            params: {
                part: 'snippet',
                channelId: channelId,
                maxResults: 5,
                order: 'date',
                type: 'video',
                key: YT_API_KEY,
            },
        });
        const recentVideos = await Promise.all(videosResponse.data.items.map(async (video) => {
            const videoId = video.id.videoId;
            const videoDetailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
                params: {
                    part: 'statistics,snippet',
                    id: videoId,
                    key: YT_API_KEY,
                },
            });
            const videoDetails = videoDetailsResponse.data.items[0];
            return {
                title: videoDetails.snippet.title,
                description: videoDetails.snippet.description,
                publishedAt: videoDetails.snippet.publishedAt,
                likes: videoDetails.statistics.likeCount,
                comments: videoDetails.statistics.commentCount,
                views: videoDetails.statistics.viewCount,
            };
        }));
        const youtubeChannelData = {
            ...channelInfo,
            recentVideos,
        };
        const newYouTubeChannel = new YouTubeChannel(youtubeChannelData);
        await newYouTubeChannel.save();
        res.json({ stats: channelInfo, recentVideos });
    } catch (error) {
        console.error('Error fetching data from YouTube API:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error fetching data from YouTube API' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
