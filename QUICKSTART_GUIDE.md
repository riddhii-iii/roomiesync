# RoomieSync - Quick Start Guide

## Getting Started

### Demo Login Credentials

Email: aisha@example.com
Password: demo123

OR

Email: marcus@example.com
Password: demo123


### Quick User Flow

#### 1. **First Time Visit**
- Go to index.html
- Click "Get Started" redirects to login
- Or click "Login" button  goes to login page

#### 2. **Login**
- Enter email: aisha@example.com
- Enter password: demo123
- Click "Login"
- Redirected to home page
- Navbar now shows: Profile, Post Room, Logout

#### 3. **Register New Account**
- On login page, scroll to "Register" section
- Fill in: Name, Email, Password, City, Bio
- Click "Register"
- New account created
- Auto-logged in
- Redirected to home page

#### 4. **Browse Roommates**
- Click "Matches" in navbar
- See all profiles with compatibility scores
- Click "View profile" to see details
- Click "Message" to test chat

#### 5. **Browse Rooms**
- Click "Rooms" in navbar
- See all listings with prices
- Click "See roommates" to view profiles
- Click "Contact" to test messaging

#### 6. **Post a Room Listing**
- Log in first (required)
- Click "Post Room" in navbar
- Fill in details:
  - Title (e.g., "Sunny Room in Downtown")
  - Location (e.g., "Austin, TX")
  - Room Type (Private/Shared/Studio)
  - Price (e.g., 650)
  - Description
  - Upload image (optional)
- Click "Post room"
- Redirected to rooms page
- Your listing appears

#### 7. **Edit Your Profile**
- Click "Profile" in navbar (or Profile icon)
- Edit Name, City, Bio, Tags
- Upload new avatar image
- Click "Save profile"
- Changes saved immediately
- Changes persist after refresh

#### 8. **Community Chat**
- Click "Chat" in navbar
- See previous messages
- Type a message and send
- Your message appears
- Messages persist

#### 9. **Mobile Testing**
- Resize browser to mobile size (< 768px)
- Click hamburger menu ()
- See navigation items stacked
- Click a link  menu closes
- All buttons are clickable
- Forms are readable

#### 10. **Logout**
- Click "Logout" button in navbar
- Redirected to login page
- Session cleared
- Try accessing /profile.html  redirects to login

---

## Testing Checklist

### Desktop (1024px+)
- [ ] Home page loads with full hero layout
- [ ] CSS is styled (not plain text)
- [ ] All links work
- [ ] Login/Register works
- [ ] Profile upload works
- [ ] Room posting works
- [ ] Can see all pages

### Tablet (768px)
- [ ] Navbar becomes hamburger menu
- [ ] Hero stacks vertically
- [ ] Grids become 1-2 columns
- [ ] All buttons are clickable
- [ ] Forms are readable

### Mobile (480px)
- [ ] All text is readable (no tiny fonts)
- [ ] Buttons are full width and tappable
- [ ] No horizontal scrolling
- [ ] Images scale properly
- [ ] Forms stack properly
- [ ] Menu works smoothly

### Browser Console (F12)
- [ ] No red error messages
- [ ] No undefined variable warnings
- [ ] Network tab shows all files loaded
- [ ] Storage tab shows localStorage data

---

## File Structure


RoomieSync/
 index.html              (Home page)
 login.html              (Login/Register)
 matches.html            (Browse roommates)
 rooms.html              (Browse rooms)
 profile.html            (User profile)
 post-room.html          (Create listing)
 chat.html               (Community chat)
 data.json               (Demo data)
 css/
    style.css           (All styles)
 js/
    script.js           (All functionality)
 images/
    avatar-1.svg
    avatar-2.svg
    avatar-3.svg
    room-1.svg
    room-2.svg
 DEPLOYMENT_CHECKLIST.md (This file)


---

## Troubleshooting

### CSS not loading?
- Check: css/style.css exists
- Check: Not from images/css/ (old location)
- Refresh browser (Ctrl+F5)

### Login not working?
- Use exact email: aisha@example.com
- Use exact password: demo123
- Check browser console for errors

### Images not showing?
- Check: images/ folder has avatars and rooms
- Check: Console for 404 errors
- Images are SVG files (vector graphics)

### Can't access profile page?
- Must be logged in
- Without login  redirected to login.html
- Try logging in first

### Data disappears after refresh?
- localStorage stores data locally
- Works within same browser/device
- Data clears if browser history is cleared

---

## Key Features to Test

1. **Authentication** 
   - Login with credentials
   - Register new account
   - Logout clears session
   - Protected pages redirect

2. **Navigation** 
   - All links work
   - Mobile menu works
   - Navbar updates on login/logout

3. **Data Persistence** 
   - Profile updates save
   - Room listings persist
   - Chat messages persist
   - Session persists on refresh

4. **Responsiveness** 
   - Desktop layout works
   - Tablet layout works
   - Mobile layout works
   - No horizontal scrolling

5. **Forms** 
   - Login form works
   - Register form validates
   - Room form uploads images
   - Profile form saves updates

6. **Images** 
   - Avatars display
   - Room images display
   - Image upload works
   - Images persist

---

## Notes for First-Time Users

- This is a **prototype** with demo data
- No real user data collection
- All data stored locally (refreshing from different browser loses data)
- Passwords not encrypted (demo only)
- No real email notifications
- No payment system
- Perfect for learning how web apps work!

---

## Deployment

Ready to deploy! Just upload to:
- **Vercel**: Connect GitHub repo
- **Netlify**: Drag & drop folder
- **GitHub Pages**: Push to gh-pages branch

No build step needed. Pure HTML/CSS/JavaScript.

---

**Happy Testing! **


