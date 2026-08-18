#!/bin/bash
cd /home/ubuntu/sougxpress-platform
git add apps/mobile/src/services/favorite.service.ts
git add apps/mobile/src/app/(tabs)/favorites.tsx
git commit -m 'feat courier add interested customers tab and update favorites hub'
git push origin main
