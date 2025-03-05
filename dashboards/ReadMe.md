# Amazon GameLiftStreams CloudWatch Metrics Dashboards

## Purpose

This document provides step-by-step instructions to install Amazon GameLift Streams on Amazon CloudWatch Metrics Dashboards. These dashboards provide real-time monitoring and visualization of critical performance metrics for Amazon GameLift Streams applications and stream groups.

## Prerequisites

- AWS account with access to the Amazon GameLift Streams and Amazon CloudWatch services.
- IAM permissions to create and manage Amazon CloudWatch dashboards.

## Steps to Install

1. Login to the AWS Management Console and navigate to the Amazon CloudWatch service.

2. In the Amazon CloudWatch dashboard, click on "Dashboards" in the left-hand menu.

3. Click on the "Create dashboard" button.

4. Give the new dashboard a name, then click "Create dashboard".

5. On the new dashboard page, click on the "Actions" dropdown and select "Import".

6. In the "Import dashboard" modal, click "Choose file" and select the relevant JSON files:
   
   - AmazonGameLiftStreamsApplicationsDashboard.json
   - AmazonGameLiftStreamsStreamGroupDashboard.json

7. Click "Import" to upload the JSON files and create the new dashboard.

8. Review the dashboard to ensure all the widgets and metrics are displaying correctly.

9. (Optional) Customize the dashboard further by adding, removing, or resizing the widgets as needed.

10. Click "Save changes" to preserve your customized dashboard.

## Accessing the Dashboards

After completing the installation steps, you can access the dashboards by:

1. Navigating to the Amazon CloudWatch service in the AWS Management Console.
2. Clicking on the "Dashboards" section in the left-hand menu.
3. Selecting the dashboard you have created and want to view from the list.

## Pricing

Please refer to the [Amazon CloudWatch pricing page](https://aws.amazon.com/cloudwatch/pricing/) for the most up-to-date information.
