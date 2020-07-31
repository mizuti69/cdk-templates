import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as elb from '@aws-cdk/aws-elasticloadbalancingv2';
import * as elb_targets from '@aws-cdk/aws-elasticloadbalancingv2-targets';
import * as s3 from '@aws-cdk/aws-s3';
import * as efs from '@aws-cdk/aws-efs';

export class ProjectStudyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here
    // Stack environment declaration
    let stage = this.node.tryGetContext("dev");

    // Import VPC
    let myVpc = ec2.Vpc.fromLookup(this, 'VPC', { vpcId: stage.vpcId });
    // Import Subet
    let myPrivateSubnet1 = ec2.Subnet.fromSubnetAttributes(this, 'PrivateSubnet1', {
      subnetId: stage.vpcSub1Id,
      availabilityZone: stage.vpcSub1Az,
      routeTableId: stage.vpcSub1Rt,
    });
    let myPrivateSubnet2 = ec2.Subnet.fromSubnetAttributes(this, 'PrivateSubnet2', {
      subnetId: stage.vpcSub2Id,
      availabilityZone: stage.vpcSub2Az,
      routeTableId: stage.vpcSub2Rt,
    });

    // Create Ec2 security group
    let mySecurityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc: myVpc,
      description: this.node.tryGetContext("projectName") + 'Server Side SecurityGroup',
      securityGroupName: this.node.tryGetContext("projectName") + '-ec2-sg',
      allowAllOutbound: true
    });
    mySecurityGroup.addIngressRule(ec2.Peer.ipv4(stage.vpcCidr), ec2.Port.allTcp(), 'All VPC');
    // Create ALB security group
    let mySecurityGroupAlb = new ec2.SecurityGroup(this, 'SecurityGroupAlb', {
      vpc: myVpc,
      description: this.node.tryGetContext("projectName") + 'Alb SecurityGroup',
      securityGroupName: this.node.tryGetContext("projectName") + '-alb-sg',
      allowAllOutbound: true
    });
    mySecurityGroupAlb.addIngressRule(ec2.Peer.ipv4(stage.vpcCidr), ec2.Port.tcp(80), 'All VPC');
    mySecurityGroupAlb.addIngressRule(ec2.Peer.ipv4(stage.vpcCidr), ec2.Port.tcp(443), 'All VPC');
    // Create EFS security group
    let mySecurityGroupEfs = new ec2.SecurityGroup(this, 'SecurityGroupEfs', {
      vpc: myVpc,
      description: this.node.tryGetContext("projectName") +  'Efs SecurityGroup',
      securityGroupName: this.node.tryGetContext("projectName") + '-efs-sg',
      allowAllOutbound: false
    });
    mySecurityGroupEfs.addIngressRule(ec2.Peer.ipv4(stage.vpcCidr), ec2.Port.allTcp(), 'All VPC');
    mySecurityGroupEfs.addEgressRule(ec2.Peer.ipv4(stage.vpcCidr), ec2.Port.allTcp(), 'All VPC');

    // Create EFS
    // Notice: This API element is experimental. It may change without notice.   
    let myStrage = new efs.FileSystem(this, 'Efs', {
      vpc: myVpc,
      fileSystemName: this.node.tryGetContext("projectName") + '-Efs',
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      securityGroup: mySecurityGroupEfs,
      vpcSubnets: {
        subnets: [myPrivateSubnet1,myPrivateSubnet2],
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Notice: Make the production environment RETAIN
    });

    // Create Ec2 service role
    let myRole = new iam.Role(this, 'Ec2role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: this.node.tryGetContext("projectName") + '-ec2-role',
    });
    myRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticFileSystemClientFullAccess'));

    // Set AMI
    let myAMI = new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    });
    /*
    let myAMI = ec2.MachineImage.latestAmazonLinux({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      edition: ec2.AmazonLinuxEdition.STANDARD,
      virtualization: ec2.AmazonLinuxVirt.HVM,
      storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
    });
    */

    // Set InstanceType
    let myInstanceType = new ec2.InstanceType(stage.ec2InstanceType);

    // Set EBS
    let myEBS = ec2.BlockDeviceVolume.ebs(stage.ec2EbsSize);

    // Create Ec2 Instance
    // Notice: I want to repeat the process...
    let myInstance1 = new ec2.Instance(this, 'Instance1', {
      instanceType: myInstanceType,
      machineImage: myAMI,
      vpc: myVpc,
      instanceName: this.node.tryGetContext("projectName") + '-01',
      keyName: stage.ec2KeyPair,
      role: myRole,
      securityGroup: mySecurityGroup,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: myEBS,
        }
      ],
      vpcSubnets: {
        subnets: [myPrivateSubnet1],
      },
    });
    myInstance1.addUserData(
      "yum check-update -y",    // Ubuntu: apt-get -y update
      "yum upgrade -y",                                 // Ubuntu: apt-get -y upgrade
      "yum install -y amazon-efs-utils",                // Ubuntu: apt-get -y install amazon-efs-utils
      "yum install -y nfs-utils",                       // Ubuntu: apt-get -y install nfs-common
      "file_system_id_1=" + myStrage.fileSystemId,
      "efs_mount_point_1=/data/efs",
      "mkdir -p \"${efs_mount_point_1}\"",
      "test -f \"/sbin/mount.efs\" && echo \"${file_system_id_1}:/ ${efs_mount_point_1} efs defaults,_netdev\" >> /etc/fstab || " +
      "echo \"${file_system_id_1}.efs." + cdk.Stack.of(this).region + ".amazonaws.com:/ ${efs_mount_point_1} nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0\" >> /etc/fstab",
      "mount -a -t efs,nfs4 defaults"
    );
    let myInstance2 = new ec2.Instance(this, 'Instance2', {
      instanceType: myInstanceType,
      machineImage: myAMI,
      vpc: myVpc,
      instanceName: this.node.tryGetContext("projectName") + '-02',
      keyName: stage.ec2KeyPair,
      role: myRole,
      securityGroup: mySecurityGroup,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: myEBS,
        }
      ],
      vpcSubnets: {
        subnets: [myPrivateSubnet2],
      },
    });
    myInstance2.addUserData(
      "yum check-update -y",    // Ubuntu: apt-get -y update
      "yum upgrade -y",                                 // Ubuntu: apt-get -y upgrade
      "yum install -y amazon-efs-utils",                // Ubuntu: apt-get -y install amazon-efs-utils
      "yum install -y nfs-utils",                       // Ubuntu: apt-get -y install nfs-common
      "file_system_id_1=" + myStrage.fileSystemId,
      "efs_mount_point_1=/data/efs",
      "mkdir -p \"${efs_mount_point_1}\"",
      "test -f \"/sbin/mount.efs\" && echo \"${file_system_id_1}:/ ${efs_mount_point_1} efs defaults,_netdev\" >> /etc/fstab || " +
      "echo \"${file_system_id_1}.efs." + cdk.Stack.of(this).region + ".amazonaws.com:/ ${efs_mount_point_1} nfs4 nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport,_netdev 0 0\" >> /etc/fstab",
      "mount -a -t efs,nfs4 defaults"
    );
    myRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'));
    myRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM'));

    // Create S3
    let myLogS3 = new s3.Bucket(this, 'LogBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      bucketName: this.node.tryGetContext("projectDnsName") + '-logbucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Notice: Make the production environment RETAIN
    });
    myRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));

    // Set alb certificate
    // Notice: generated aws console only
    let myCert = elb.ListenerCertificate.fromArn(stage.acmCertArn); 

    // Set default action
    let myDefAction80 = elb.ListenerAction.redirect({
      protocol: 'HTTPS',
      port: '443',
    });
    let myDefAction443 = elb.ListenerAction.fixedResponse(503, {
      messageBody: 'Sorry!!',
    });

    // Create terget group
    let myAlbTargetGp = new elb.ApplicationTargetGroup(this, 'AlbDefGroup', {
      deregistrationDelay: cdk.Duration.seconds(300),
      healthCheck: {
        healthyHttpCodes: '200',
        healthyThresholdCount: 5,
        interval: cdk.Duration.seconds(30),
        path: '/',
        port: stage.elbTargetHealthPort,
        protocol: elb.Protocol.HTTP,
        timeout: cdk.Duration.seconds(5),
        unhealthyThresholdCount: 2,
      },
      port: stage.elbTargetPort,
      protocol: elb.ApplicationProtocol.HTTP,
      stickinessCookieDuration: cdk.Duration.days(1),
      targetGroupName: this.node.tryGetContext("projectName") + '-TopTarget-Gp',
      targetType: elb.TargetType.INSTANCE,
      targets: [
        new elb_targets.InstanceTarget(myInstance1),
        new elb_targets.InstanceTarget(myInstance2),
      ],
      vpc: myVpc,
    });

    // Create ALB
    // Notice: Note that any permission policy is inserted by default when the ALB is created.
    let myLB = new elb.ApplicationLoadBalancer(this, 'ALB', {
      vpc: myVpc,
      idleTimeout: cdk.Duration.seconds(300),
      internetFacing: stage.elbInternet,
      loadBalancerName: this.node.tryGetContext("projectName") + '-alb',
      securityGroup: mySecurityGroupAlb,
      vpcSubnets: {
        subnets: [myPrivateSubnet1,myPrivateSubnet2],
      },
    })
    // Set default rule
    //let myLB80 = myLB.addListener('listener80',{
    myLB.addListener('listener80',{
      defaultAction: myDefAction80,
      port: 80,
      protocol: elb.ApplicationProtocol.HTTP,
    });
    let myLB443 = myLB.addListener('listener443',{
      certificates: [
        myCert,
      ],
      defaultAction: myDefAction443,
      port: 443,
      protocol: elb.ApplicationProtocol.HTTPS,
    });
    // Set path rule
    myLB443.addAction('TopTarget', {
      action: elb.ListenerAction.forward([
        myAlbTargetGp,
      ]),
      conditions: [
        elb.ListenerCondition.pathPatterns(
          ['*'],
        ),
      ],
      priority: 1,
    });
    myLB.logAccessLogs(myLogS3, 'logs');

  }
}
