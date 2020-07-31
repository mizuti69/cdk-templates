# AWS CDK Develop Template

## How to Use
Develop using docker desktop for windows & Typescript  
Add settings to mount project-study on docker desktop  

### Step 0
As a prerequisite, also install Nodejs and aws-cdk on windows terminal.  
This is because aws-cdk is made to be aware of the execution terminal.  

```
> npm install -g aws-cdk
```

Notice: Not required if the container is changed to something other than alpin OS  

### Step 1
Launch docker desktop and build container  

```
> cd docker
> docker-compose up -d
```

### Step 2
Access the container and develop the CDK  

```
> docker-compose exec aws-cdk /bin/bash
bash-5.0#
```

Update aws-cdk if necessary  

```
# npm update -g aws-cdk
# npm update
```

### Step 3
Setting up an AWS account  

```
# aws configure
```

## Documentation
**THE TYPESCRIPT WORKSHOP**  
https://cdkworkshop.com/20-typescript.html

**AWS CDK API Refernce**  
https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html  

### CDK Command  

* Compile and syntax check  

```
> npm run watch
```

* Cloudformation formatting  

```
# cdk synth
```

* Difference check

```
# cdk diff
```

* Deploy

```
# cdk deploy
```

### Creating a new project
create and initialize work directory  

```
> mkdir project-work
> cd project-work
> cdk init --language typescript
```

AWS integration  

```
# cdk bootstrap 
```
