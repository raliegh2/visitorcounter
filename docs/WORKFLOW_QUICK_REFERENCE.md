# Workflow Quick Reference

```text
git switch dev
git pull origin dev
git switch -c feature/<feature-name>

# develop and test

git add .
git commit -m "feat: describe the feature"
git push -u origin feature/<feature-name>
```

Open a pull request into `dev`. After integration testing, promote with pull requests in this order:

```text
dev -> staging -> main
```

Never push feature work directly to `main`.
