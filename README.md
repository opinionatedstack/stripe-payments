# stripe-payments


docker build -t opinionatedstack/stripe-payments:latest -f Dockerfile.prod .
docker push opinionatedstack/stripe-payments:latest

docker build -t opinionatedstack/stripe-payments:latest -f Dockerfile.prod . && docker push opinionatedstack/stripe-payments:latest && say done

docker run --name spay -it --rm -p 3001:3001 opinionatedstack/stripe-payments
