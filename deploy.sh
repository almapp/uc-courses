if [ ! -z "$TRAVIS_TAG" ]; then
  docker tag $LOCAL_IMAGE:latest $REGISTRY_IMAGE:$TRAVIS_TAG
  docker push $LOCAL_IMAGE
elif [ "$TRAVIS_BRANCH" == "master" ]; then
  docker tag $LOCAL_IMAGE:latest $REGISTRY_IMAGE:latest
  docker push $LOCAL_IMAGE
fi
