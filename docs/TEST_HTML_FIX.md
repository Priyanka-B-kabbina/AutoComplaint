# 🚨 test.html Not Working - QUICK FIX

## The Problem:
test.html shows "Extension API not available" because Chrome doesn't allow extensions to access local files by default.

## ⚡ SOLUTION (2 minutes):

### Step 1: Enable File URL Access
1. Open new tab: `chrome://extensions/`
2. Find "AutoComplaint" extension
3. Click **"Details"** button
4. Scroll down to find **"Allow access to file URLs"**
5. **Turn this ON** (toggle should be blue)

### Step 2: Refresh and Test
1. Go back to test.html
2. Press **F5** to refresh the page
3. Try the extension - should work now!

## 🧪 Alternative Test Methods:

### Method 1: Use the New Test File
- Open `test-working.html` instead of `test.html`
- This version has better diagnostics and clearer error messages

### Method 2: Use Local Server (Advanced)
```bash
cd /Users/Kabbinapriyanka/Downloads/AutoComplaint
python3 -m http.server 8000
```
Then open: `http://localhost:8000/test.html`

### Method 3: Test on Real Website
- Go to Amazon.in order page → Save order details
- Go to consumerhelpline.gov.in → Use Fill In button

## 🔍 Verify the Fix:

✅ **Expected Behavior After Fix:**
- Open test.html
- Extension popup shows "Fill In" button
- Clicking "Fill In" populates the form with saved order data
- No more "Extension API not available" errors

❌ **If Still Not Working:**
1. Reload the extension (refresh button in extensions page)
2. Clear browser cache
3. Try in incognito mode
4. Use the `test-working.html` file instead

## 📋 Quick Checklist:

□ "Allow access to file URLs" is enabled  
□ Extension is enabled in chrome://extensions/  
□ test.html is opened via file:// URL  
□ Page has been refreshed after enabling file access  
□ Extension popup opens when clicking the icon

---

**90% of test.html issues are fixed by enabling "Allow access to file URLs"!**
