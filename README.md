# CaneLift

A phone-first workout tracker with a University of Miami-inspired visual style. It runs as a static web app, saves data on your device, and can be installed to your phone from a GitHub Pages link.

## What It Does

- Save repeatable workout routines.
- Track exercises with weight, reps, and sets.
- Replace an exercise during a live workout.
- Reorder exercises during a live workout or in a routine template.
- Save completed workout history.
- Carry the strongest set from the most recent session for each exercise into any future routine where that exercise appears.
- Track elapsed workout time.
- Export/import your data from the Profile tab.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal.

## Put It On Your Phone With GitHub

1. Create a GitHub repo and push this project to it.
2. In GitHub, open the repo settings and go to `Pages`.
3. Set the Pages source to `GitHub Actions`.
4. The included workflow builds and publishes the app when you push to `main`.
5. Open the published `https://<your-username>.github.io/<your-repo>/` link on your phone.
6. On iPhone: tap Share, then `Add to Home Screen`.
7. On Android: open Chrome menu, then `Install app` or `Add to Home screen`.

Your workouts are stored in that phone browser's local storage. Use Profile -> Export before clearing browser data or changing phones.
