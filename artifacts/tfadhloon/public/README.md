# Tfadhloon Game

This is a question-and-answer team-based guessing game where players answer multiple choice questions.

## 📋 Files

- `tfadhloon-homepage.html` - Game entry point
- `tfadhloon-lobby.html` - Game lobby and player joining
- `tfadhloon-gameplay.html` - Main game play with questions
- `tfadhloon-finalresults.html` - Results and scoreboard
- `admin.html` - Admin panel
- `admin-dashboard.html` - Admin dashboard
- CSS files - Game styles
- JS files - Game logic
- `custom/` - Custom fonts and language support
- `fonts/` - Font files
- `gallary/` - Images and backgrounds
- `voiceChat.js` - Voice chat functionality

## 🔧 Configuration

**IMPORTANT:** Update the landing page URL in all JS files:

### Update in `tfadhloon-homepage.js`:
```javascript
// No LANDING_PAGE_URL needed - homepage doesn't link back directly
```

### Update in `tfadhloon-gameplay.js`:
```javascript
const LANDING_PAGE_URL = "https://your-landing-page-hosting.com";
```

### Update in `tfadhloon-finalresults.js`:
```javascript
const LANDING_PAGE_URL = "https://your-landing-page-hosting.com";
```

## 🚀 Deployment

### Using Vercel
```bash
npm install -g vercel
vercel --prod
```

### Using Netlify
1. Connect repository
2. Publish directory: `.`

### Manual FTP Upload
Upload all files to your hosting account.

## 🎮 Game Flow

1. **Homepage** (`tfadhloon-homepage.html`) - Create or join game with access code
2. **Lobby** (`tfadhloon-lobby.html`) - Add questions, select number of questions, wait for other players
3. **Gameplay** (`tfadhloon-gameplay.html`) - Answer multiple choice questions, earn points
4. **Results** (`tfadhloon-finalresults.html`) - View final scores and replay option

## ✅ Features

- ❓ Multiple choice questions
- 👥 Team-based gameplay
- 📊 Points and scoring system
- 🎯 Various question categories
- 🌍 Multi-language support
- 📱 Responsive design
- 🎤 Voice chat integration
- 🔧 Admin question management

## 📋 Game Features in Lobby

- Add custom questions during lobby phase
- Set number of questions to play
- Show/hide questions to other players
- Real-time player count
- Copy game code for easy sharing

## ✅ Testing

1. Open `tfadhloon-homepage.html`
2. Create a new game
3. Add some test questions
4. Select number of questions
5. Start the game
6. Play through questions
7. Check results screen
8. Test "Back to Hub" button

## 🔐 Admin Features

- `admin.html` - Admin login
- `admin-dashboard.html` - Manage active games, view statistics

## 📱 Mobile Compatibility

- Fully responsive design
- Touch-friendly interface
- Works on phones, tablets, and desktops

## 🌐 Firebase Integration

Uses Firebase Realtime Database for:
- Game state synchronization
- Player data management
- Real-time question updates
- Score tracking

## 📞 Troubleshooting

- **Cannot join game:** Verify access code is correct
- **Questions won't load:** Check Firebase permissions
- **Back button not working:** Verify `LANDING_PAGE_URL` config
- **Images missing:** Ensure `gallary/` folder is uploaded
- **Scoring issues:** Check Firebase database has correct data
