# Plan: Make Provider Pills Functional

## Context
The Watch page has provider pills (KIWI, ARC, ZORO) in the Servers component, but clicking them doesn't actually switch the stream source. Currently, the episodes are fetched from a single provider (the preferred one) and the pills are just visual. We need to make switching providers actually change the episode source.

## Approach
1. Fetch all episodes from ALL providers in `getEpisodes.utils.js`
2. Store all episodes by provider in `useWatch` hook
3. When a provider pill is clicked, switch to that provider's episodes
4. Update the stream fetch to use the new provider's episode slug

## Files to Modify

### 1. `src/utils/getEpisodes.utils.js`
- Fetch and return all episodes from all available providers
- Return `allEpisodesByProvider` object containing episodes grouped by provider and category

### 2. `src/hooks/useWatch.js`
- Store `allEpisodesByProvider` from API response
- Add `currentProvider` state to track selected provider
- Update `handleProviderChange` function to switch provider and reload episodes
- When provider changes, fetch stream using the new provider's episode slug

### 3. `src/components/servers/Servers.jsx`
- Already has the UI for provider pills
- Pass `currentProvider` and `onProviderChange` props
- Update styling for active/inactive states

### 4. `src/pages/watch/Watch.jsx`
- Pass provider state and handler to Servers component

## Steps
- [ ] 1. Modify `getEpisodes.utils.js` to return all episodes by provider
- [ ] 2. Update `useWatch` hook to store and switch providers
- [ ] 3. Update `Watch.jsx` to pass provider props to Servers
- [ ] 4. Update `Servers.jsx` to handle provider switching
- [ ] 5. Test provider switching works correctly

## Verification
1. Click KIWI pill → episodes load from kiwi provider
2. Click ARC pill → episodes switch to arc provider
3. Stream URL updates to use new provider's episode slug
4. Video player loads stream from new provider
